import { expect, it, vi } from "vitest";
import { demoUserId } from "@/lib/auth/demo-identity";
import { getDb } from "@/lib/db/client";
import { fixtureId } from "@/lib/db/fixture-id";
import {
  conflicts,
  resolveConflict,
  reviewConflict,
} from "@/services/conflict.service";
import { createBooking } from "@/services/booking.service";
import { scheduleMaintenance } from "@/services/maintenance.service";
import { notifications } from "@/services/notification.service";
import type { Actor } from "@/types/domain";

vi.stubEnv("DATABASE_PATH", ":memory:");
const id = fixtureId(10, 0);
const now = new Date("2026-11-23T02:00:00Z");
const staff: Actor = { role: "incharge", userId: demoUserId("incharge") };
const student: Actor = { role: "student", userId: demoUserId("student") };
const admin: Actor = { role: "admin", userId: demoUserId("admin") };
function reset(): void {
  const db = getDb();
  db.prepare("DELETE FROM allocation_decisions").run();
  db.prepare("DELETE FROM notifications").run();
  db.prepare("DELETE FROM audit_log").run();
  db.prepare(
    "UPDATE conflict_groups SET status='open',resolved_at=NULL,resolved_by=NULL WHERE id=?",
  ).run(id);
  db.prepare(
    `UPDATE bookings SET status='faculty_approved',incharge_approved_at=created_at,start_at='2026-11-24T04:30:00.000Z',
    end_at='2026-11-24T06:30:00.000Z',created_at='2026-11-22T02:00:00.000Z' WHERE conflict_group_id=?`,
  ).run(id);
  db.prepare(
    "UPDATE conflict_groups SET window_start='2026-11-24T04:30:00.000Z',window_end='2026-11-24T06:30:00.000Z' WHERE id=?",
  ).run(id);
}
it("F-41/44 ranks the seeded FPGA conflict and accepts with notifications and audit", () => {
  reset();
  const review = reviewConflict(staff, id, now);
  expect(review.ranked.map((row) => row.bookingId)).toEqual([
    fixtureId(9, 0),
    fixtureId(9, 2),
    fixtureId(9, 1),
  ]);
  expect(review.ranked[0].outcome).toBe("approved");
  expect(
    getDb().prepare("SELECT count(*) FROM allocation_decisions").pluck().get(),
  ).toBe(3);
  expect(
    resolveConflict(
      staff,
      id,
      { action: "accept", revision: review.revision },
      now,
    ),
  ).toMatchObject({
    approved: [fixtureId(9, 0)],
    displaced: [fixtureId(9, 1), fixtureId(9, 2)],
  });
  expect(reviewConflict(staff, id, now).ranked[0].finalOutcome).toBe(
    "approved",
  );
  const displaced = notifications({ role: "student", userId: fixtureId(5, 0) });
  expect(
    displaced.items.some(
      (row) =>
        row.title === "Request alternative" && row.link?.includes("?start="),
    ),
  ).toBe(true);
  const audit = getDb()
    .prepare("SELECT metadata FROM audit_log WHERE action='conflict.accept'")
    .pluck()
    .get();
  expect(JSON.parse(String(audit)).recommendation).toHaveLength(3);
  expect(() => resolveConflict(admin, id, { action: "accept" }, now)).toThrow(
    expect.objectContaining({ status: 409 }),
  );
});
it("F-44 requires a reason, checks overlaps, and saves an authorized override", () => {
  reset();
  const ids = [fixtureId(9, 0), fixtureId(9, 1)];
  expect(() =>
    resolveConflict(
      staff,
      id,
      { action: "override", winnerIds: [ids[1]] },
      now,
    ),
  ).toThrow(expect.objectContaining({ status: 422 }));
  expect(() =>
    resolveConflict(
      staff,
      id,
      {
        action: "override",
        winnerIds: ids,
        reason: "Different research schedule.",
      },
      now,
    ),
  ).toThrow(expect.objectContaining({ status: 422 }));
  expect(() =>
    resolveConflict(
      staff,
      id,
      { action: "accept", revision: "0".repeat(64) },
      now,
    ),
  ).toThrow(expect.objectContaining({ status: 409 }));
  expect(
    resolveConflict(
      admin,
      id,
      {
        action: "override",
        winnerIds: [ids[1]],
        reason: "Required for a supervised class.",
      },
      now,
    ).approved,
  ).toEqual([ids[1]]);
  expect(
    getDb()
      .prepare("SELECT DISTINCT override_reason FROM allocation_decisions")
      .pluck()
      .all(),
  ).toEqual(["Required for a supervised class."]);
});
it("SEC-05 scopes staff and leaves awaiting-faculty requests untouched", () => {
  reset();
  const foreign: Actor = { role: "incharge", userId: fixtureId(4, 0) };
  expect(conflicts(foreign)).toEqual([]);
  expect(() => reviewConflict(foreign, id, now)).toThrow(
    expect.objectContaining({ status: 404 }),
  );
  expect(() => resolveConflict(student, id, { action: "accept" }, now)).toThrow(
    expect.objectContaining({ status: 403 }),
  );
  getDb()
    .prepare("UPDATE bookings SET status='pending_approval' WHERE id=?")
    .run(fixtureId(9, 1));
  expect(reviewConflict(staff, id, now).awaiting).toHaveLength(1);
  resolveConflict(staff, id, { action: "accept" }, now);
  expect(
    getDb()
      .prepare("SELECT status FROM bookings WHERE id=?")
      .pluck()
      .get(fixtureId(9, 1)),
  ).toBe("pending_approval");
});

it("F-46 displaces future confirmed bookings when maintenance is scheduled", () => {
  const item = fixtureId(7, 11);
  const window = {
    startAt: "2026-11-24T04:30:00.000Z",
    endAt: "2026-11-24T05:30:00.000Z",
  };
  const booking = createBooking(
    student,
    { equipmentId: item, ...window, justification: "" },
    now,
  );
  expect(() =>
    scheduleMaintenance(staff, item, window, "Calibration", now),
  ).toThrow(expect.objectContaining({ status: 404 }));
  expect(
    scheduleMaintenance(admin, item, window, "Calibration", now).affected,
  ).toBe(1);
  expect(
    getDb()
      .prepare("SELECT status FROM bookings WHERE id=?")
      .pluck()
      .get(booking.id),
  ).toBe("displaced");
  expect(notifications(student).items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: "Booking affected by maintenance" }),
      expect.objectContaining({
        title: "Request alternative",
        link: expect.stringContaining("?start="),
      }),
    ]),
  );
});
