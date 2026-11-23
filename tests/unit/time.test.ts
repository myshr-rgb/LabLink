import { expect, it } from "vitest";
import { campusDate, ceilToSlot, isSlotBoundary } from "@/lib/booking/time";
import { overlaps } from "@/lib/booking/overlap";

it("F-20 handles IST midnight and rounds partial slots upward", () => {
  const before = new Date("2026-12-31T18:29:59.999Z");
  const midnight = new Date("2026-12-31T18:30:00Z");
  expect(campusDate(before)).toBe("2026-12-31");
  expect(campusDate(midnight)).toBe("2027-01-01");
  expect(isSlotBoundary(before)).toBe(false);
  expect(isSlotBoundary(midnight)).toBe(true);
  expect(ceilToSlot(before)).toEqual(midnight);
  expect(ceilToSlot(midnight)).toEqual(midnight);
});
it.each([
  [0, 2, 2, 4, false],
  [0, 5, 1, 2, true],
  [0, 5, 0, 5, true],
  [0, 3, 2, 5, true],
  [0, 2, 1, 1, false],
] as const)("F-21 overlap [%i,%i) [%i,%i) = %s", (a, b, c, d, expected) => {
  const first = { start: new Date(a), end: new Date(b) };
  const second = { start: new Date(c), end: new Date(d) };
  expect(overlaps(first, second)).toBe(expected);
  expect(overlaps(second, first)).toBe(expected);
});
