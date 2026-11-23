import { expect, it, vi } from "vitest";
import { demoUserId } from "@/lib/auth/demo-identity";
import { getDb } from "@/lib/db/client";
import { equipmentSearch } from "@/lib/validation/equipment";
import {
  catalogue,
  equipmentAvailability,
  equipmentFacets,
} from "@/services/equipment.service";
import {
  bookingDetail,
  cancelBooking,
  createBooking,
  modifyBooking,
} from "@/services/booking.service";
import { approvals, decide } from "@/services/approval.service";
import {
  createProject,
  projectDetail,
  updateProject,
} from "@/services/project.service";
import { markRead, notifications } from "@/services/notification.service";
import type { Actor } from "@/types/domain";

vi.stubEnv("DATABASE_PATH", ":memory:");
const now = new Date("2026-11-23T03:00:00Z");
const student: Actor = { role: "student", userId: demoUserId("student") };
const faculty: Actor = { role: "faculty", userId: demoUserId("faculty") };
const admin: Actor = { role: "admin", userId: demoUserId("admin") };
function lookup(sql: string, arg: string): string {
  return getDb().prepare<[string], string>(sql).pluck().get(arg)!;
}
const item = (name: string) =>
  lookup("SELECT id FROM equipment WHERE name=?", name);
const account = (email: string) =>
  lookup("SELECT id FROM users WHERE email=?", email);
const otherStudent = () =>
  ({ role: "student", userId: account("student1@example.edu") }) as const;
const otherFaculty = () =>
  ({ role: "faculty", userId: account("faculty1@example.edu") }) as const;
const times = (start: string, end: string) => ({
  startAt: `2026-11-23T${start}:00.000Z`,
  endAt: `2026-11-23T${end}:00.000Z`,
});
const projectInput = () => ({
  title: "Campus sensor",
  description: "Design a small sensor.",
  guideId: faculty.userId,
  deadline: "2026-12-03T12:00:00.000Z",
  memberIds: [otherStudent().userId],
  equipmentIds: [item("FPGA Board B")],
});

it("F-10/11 combines filters and keyword, sorts and paginates", () => {
  expect(equipmentFacets().departments).toHaveLength(5);
  const filters = {
    q: "FPGA",
    department: "ECE",
    category: "electronics",
    accessType: "open",
    date: "2026-11-23",
  };
  expect(
    catalogue(equipmentSearch.parse(filters), now).items.map(
      (record) => record.name,
    ),
  ).toEqual(["FPGA Board B"]);
  expect(
    catalogue(equipmentSearch.parse({ ...filters, department: "EEE" }), now)
      .total,
  ).toBe(0);
  const first = catalogue(
    equipmentSearch.parse({ sort: "name", pageSize: "2" }),
    now,
  );
  const second = catalogue(
    equipmentSearch.parse({ sort: "name", pageSize: "2", page: "2" }),
    now,
  );
  expect(first.total).toBe(36);
  expect(first.items).toHaveLength(2);
  expect(first.items[1].name.localeCompare(second.items[0].name)).toBeLessThan(
    0,
  );
});
it("F-21/22 invalidates cached availability on writes and rejects foreign access", () => {
  const equipmentId = item("Arduino Uno R4");
  getDb()
    .prepare("UPDATE equipment SET close_time='09:30' WHERE id=?")
    .run(equipmentId);
  const search = equipmentSearch.parse({ q: "Arduino", date: "2026-11-23" });
  expect(catalogue(search, now).total).toBe(1);
  const input = { equipmentId, ...times("03:30", "04:00"), justification: "" };
  const booking = createBooking(student, input, now);
  expect(booking.status).toBe("approved");
  expect(catalogue(search, now).total).toBe(0);
  expect(() => createBooking(otherStudent(), input, now)).toThrow(
    expect.objectContaining({
      code: "SLOT_TAKEN",
      details: { alternatives: expect.any(Array) },
    }),
  );
  for (const readOrWrite of [
    () => bookingDetail(otherStudent(), booking.id, now),
    () => modifyBooking(otherStudent(), booking.id, input, now),
    () => cancelBooking(otherStudent(), booking.id, now),
  ])
    expect(readOrWrite).toThrow(expect.objectContaining({ status: 404 }));
  expect(cancelBooking(student, booking.id, now).status).toBe("cancelled");
  expect(catalogue(search, now).total).toBe(1);
});
it("F-13/21/23 leaves adjacent bookings free and releases no-shows at grace expiry", () => {
  const equipmentId = item("Raspberry Pi 5");
  const first = createBooking(
    student,
    { equipmentId, ...times("03:30", "04:00"), justification: "" },
    now,
  );
  expect(
    createBooking(
      otherStudent(),
      { equipmentId, ...times("04:00", "04:30"), justification: "" },
      now,
    ).status,
  ).toBe("approved");
  const at = new Date("2026-11-23T03:45:00Z");
  expect(equipmentAvailability(equipmentId, at)[0].slots[0].state).toBe(
    "booked",
  );
  expect(bookingDetail(student, first.id, at).status).toBe("no_show");
});
it("F-30/31/33/35/50 validates projects, authorizes decisions and resubmits requests", () => {
  const input = projectInput();
  expect(() =>
    createProject(student, { ...input, deadline: now.toISOString() }, now),
  ).toThrow(expect.objectContaining({ status: 422 }));
  expect(() =>
    createProject(student, { ...input, guideId: student.userId }, now),
  ).toThrow(expect.objectContaining({ status: 422 }));
  const project = createProject(student, input, now);
  expect(projectDetail(otherStudent(), project.id)).toMatchObject({
    equipmentIds: input.equipmentIds,
  });
  expect(() => projectDetail(otherFaculty(), project.id)).toThrow(
    expect.objectContaining({ status: 404 }),
  );
  expect(() =>
    updateProject(student, project.id, { priority: "critical" }, now),
  ).toThrow(expect.objectContaining({ status: 403 }));
  expect(
    updateProject(faculty, project.id, { priority: "high" }, now).priority,
  ).toBe("high");
  const equipmentId = item("GPU Workstation A");
  const request = {
    equipmentId,
    ...times("05:00", "06:00"),
    justification: "Run sensor simulations",
  };
  expect(() => createBooking(student, request, now)).toThrow(
    expect.objectContaining({ status: 422 }),
  );
  const booking = createBooking(
    student,
    { ...request, projectId: project.id },
    now,
  );
  expect(booking.status).toBe("pending_approval");
  expect(approvals(faculty).some((entry) => entry.id === booking.id)).toBe(
    true,
  );
  expect(
    approvals(otherFaculty()).some((entry) => entry.id === booking.id),
  ).toBe(false);
  expect(approvals(admin).some((entry) => entry.id === booking.id)).toBe(true);
  expect(() =>
    decide(
      otherFaculty(),
      booking.id,
      { decision: "approve", comment: "" },
      now,
    ),
  ).toThrow(expect.objectContaining({ status: 404 }));
  expect(() =>
    decide(student, booking.id, { decision: "approve", comment: "" }, now),
  ).toThrow(expect.objectContaining({ status: 403 }));
  expect(
    decide(
      faculty,
      booking.id,
      { decision: "changes", comment: "State the run length." },
      now,
    ).status,
  ).toBe("changes_requested");
  expect(
    modifyBooking(
      student,
      booking.id,
      { ...request, projectId: project.id, justification: "One-hour dry run" },
      now,
    ).status,
  ).toBe("pending_approval");
  expect(
    decide(faculty, booking.id, { decision: "approve", comment: "" }, now)
      .status,
  ).toBe("approved");
  const mine = notifications(student);
  expect(mine.items.map((entry) => entry.title)).toEqual(
    expect.arrayContaining(["Changes requested", "Booking approved"]),
  );
  expect(notifications(faculty).items.map((entry) => entry.title)).toContain(
    "Access request to review",
  );
  expect(() => markRead(otherStudent(), mine.items[0].id, now)).toThrow(
    expect.objectContaining({ status: 404 }),
  );
  markRead(student, mine.items[0].id, now);
  expect(notifications(student).unread).toBe(mine.unread - 1);
});
it("F-31 keeps pending overlaps soft and attaches competitors to the same group", () => {
  const project = createProject(student, projectInput(), now);
  const equipmentId = item("ESP32-S3 Kit");
  const input = {
    equipmentId,
    ...times("05:00", "06:00"),
    projectId: project.id,
    justification: "Test a BLE prototype",
  };
  const first = createBooking(student, input, now);
  const second = createBooking(otherStudent(), input, now);
  expect(
    decide(admin, first.id, { decision: "approve", comment: "" }, now).status,
  ).toBe("faculty_approved");
  const group = bookingDetail(student, first.id, now).conflictGroupId;
  expect(group).toBeTruthy();
  expect(bookingDetail(otherStudent(), second.id, now).conflictGroupId).toBe(
    group,
  );
  expect(
    decide(faculty, second.id, { decision: "approve", comment: "" }, now)
      .conflictGroupId,
  ).toBe(group);
});
