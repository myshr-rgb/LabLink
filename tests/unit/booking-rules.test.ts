import { expect, it } from "vitest";
import { windowProblem } from "@/lib/booking/rules";
import { availability, slotsForDay } from "@/lib/booking/slots";
import { nextStatus } from "@/lib/booking/transitions";

const schedule = {
  openTime: "09:00",
  closeTime: "10:30",
  weekdays: [1],
  advanceDays: 14,
  maxBookingMinutes: 60,
};
const day = "2026-11-23";
const now = new Date(day + "T03:29:59Z");
const window = (start: string, end: string) => ({
  startAt: `${day}T${start}:00.000Z`,
  endAt: `${day}T${end}:00.000Z`,
});
it("F-13 returns 14 IST days and preserves adjacent free slots", () => {
  const daySlots = slotsForDay(day, schedule, now, [
    { ...window("04:00", "04:30"), state: "booked" },
    { ...window("04:30", "05:00"), state: "maintenance" },
  ]);
  expect(daySlots.map((slot) => slot.state)).toEqual([
    "free",
    "booked",
    "maintenance",
  ]);
  expect(availability(schedule, now, [])).toHaveLength(14);
  expect(slotsForDay("2026-11-24", schedule, now)).toEqual([]);
});
it("F-20 rejects off-grid, past, overlong and outside-hours windows", () => {
  expect(
    windowProblem(window("03:30", "04:30"), schedule, now),
  ).toBeUndefined();
  for (const times of [
    ["03:31", "04:30"],
    ["03:00", "03:30"],
    ["03:30", "05:00"],
    ["05:00", "05:30"],
    ["04:00", "03:30"],
  ])
    expect(
      windowProblem(window(times[0], times[1]), schedule, now),
    ).toBeTruthy();
  expect(
    windowProblem(
      { startAt: "2026-12-14T03:30:00Z", endAt: "2026-12-14T04:00:00Z" },
      schedule,
      now,
    ),
  ).toBeTruthy();
});
it("F-23 maps every allowed transition and keeps terminal states closed", () => {
  expect(nextStatus("pending_approval", "facultyApprove")).toBe(
    "faculty_approved",
  );
  expect(nextStatus("pending_approval", "facultyReject")).toBe("rejected");
  expect(nextStatus("pending_approval", "requestChanges")).toBe(
    "changes_requested",
  );
  expect(nextStatus("changes_requested", "resubmit")).toBe("pending_approval");
  expect(nextStatus("faculty_approved", "inchargeApprove")).toBe(
    "faculty_approved",
  );
  expect(nextStatus("faculty_approved", "inchargeReject")).toBe("rejected");
  expect(nextStatus("faculty_approved", "displace")).toBe("displaced");
  expect(nextStatus("faculty_approved", "confirm")).toBe("approved");
  expect(nextStatus("approved", "checkIn")).toBe("checked_in");
  expect(nextStatus("checked_in", "checkOut")).toBe("completed");
  expect(nextStatus("approved", "expire")).toBe("no_show");
  expect(nextStatus("approved", "cancel")).toBe("cancelled");
  expect(nextStatus("completed", "cancel")).toBeUndefined();
  expect(nextStatus("pending_approval", "confirm")).toBeUndefined();
});
