import { expect, it } from "vitest";
import { allocate, intersect } from "@/lib/allocation/allocate";
import {
  findAlternatives,
  jaccard,
  type Resource,
} from "@/lib/allocation/alternatives";
import { factors } from "@/lib/allocation/factors";
import { score, validWeights } from "@/lib/allocation/score";
import { DEFAULT_POLICY, type Candidate } from "@/lib/allocation/types";

const now = new Date("2026-11-23T02:00:00Z");
const at = (time: string) => `2026-11-23T${time}:00.000Z`;
const span = (start: string, end: string) => ({
  startAt: at(start),
  endAt: at(end),
});
const base: Candidate = {
  id: "a",
  ...span("04:30", "05:30"),
  createdAt: now.toISOString(),
  deadline: null,
  priority: "normal",
  hoursUsed14d: 0,
  noShows60d: 0,
};
const bench: Resource = {
  id: "a",
  name: "A",
  lab: "Lab A",
  category: "electronics",
  tags: ["fpga", "logic"],
  openTime: "09:00",
  closeTime: "18:00",
  weekdays: [1, 2, 3, 4, 5, 6],
  advanceDays: 14,
  maxBookingMinutes: 120,
  blocks: [],
};
it.each([
  ["deadline", { deadline: null }, 0],
  ["deadline", { deadline: now.toISOString() }, 1],
  ["deadline", { deadline: "2026-11-30T02:00:00Z" }, 0.5],
  ["deadline", { deadline: "2026-12-09T02:00:00Z" }, 0],
  ["priority", { priority: "critical" }, 1],
  ["priority", { priority: "high" }, 0.5],
  ["priority", { priority: "normal" }, 0],
  ["fairShare", { hoursUsed14d: 0 }, 1],
  ["fairShare", { hoursUsed14d: 8 }, 0.5],
  ["fairShare", { hoursUsed14d: 16 }, 0],
  ["fairShare", { hoursUsed14d: 80 }, 0],
  ["waiting", { createdAt: "2026-11-22T02:00:00Z" }, 1 / 3],
  ["waiting", { createdAt: "2026-11-24T02:00:00Z" }, 0],
  ["waiting", { createdAt: "2026-11-15T02:00:00Z" }, 1],
  ["reliability", { noShows60d: 0 }, 1],
  ["reliability", { noShows60d: 2 }, 0.5],
  ["reliability", { noShows60d: 10 }, 0],
] as const)("F-41 normalizes %s from %j", (factor, change, expected) =>
  expect(factors({ ...base, ...change }, 8, now)[factor]).toBeCloseTo(expected),
);
it("F-41 handles zero quota, validates policy and rounds", () => {
  expect(factors(base, 0, now).fairShare).toBe(1);
  expect(factors({ ...base, hoursUsed14d: 1 }, 0, now).fairShare).toBe(0);
  expect(validWeights(DEFAULT_POLICY.weights)).toBe(true);
  expect(validWeights({ ...DEFAULT_POLICY.weights, deadline: 0.301 })).toBe(
    true,
  );
  for (const deadline of [-1, 1.1, NaN, 0.4])
    expect(validWeights({ ...DEFAULT_POLICY.weights, deadline })).toBe(false);
  expect(
    score(
      factors({ ...base, createdAt: "2026-11-22T02:00:00Z" }, 8, now),
      DEFAULT_POLICY.weights,
    ),
  ).toBe(0.383);
});
it.each([
  ["05:30", "06:00", false],
  ["04:30", "05:30", true],
  ["04:45", "05:00", true],
  ["04:00", "04:30", false],
] as const)("F-40 half-open overlap %s to %s", (start, end, expected) =>
  expect(intersect(base, span(start, end))).toBe(expected),
);
it("F-41 ranks deterministically by score, submission then ID", () => {
  const earlier = { ...base, id: "z", createdAt: "2026-11-23T01:59:59Z" };
  const b = { ...base, id: "b" };
  const next = { ...base, id: "c", ...span("05:30", "06:00") };
  const rows = [b, next, base, earlier];
  const result = allocate(rows, DEFAULT_POLICY, now);
  expect(allocate([...rows].reverse(), DEFAULT_POLICY, now)).toEqual(result);
  expect(result.map((row) => [row.bookingId, row.outcome])).toEqual([
    ["z", "approved"],
    ["a", "displaced"],
    ["b", "displaced"],
    ["c", "approved"],
  ]);
  expect(allocate([], DEFAULT_POLICY, now)).toEqual([]);
});
it("F-42 explains the top numeric factors and respects confirmed blockers", () => {
  const [result] = allocate(
    [{ ...base, deadline: "2026-11-26T02:00:00Z", hoursUsed14d: 2 }],
    DEFAULT_POLICY,
    now,
    [base],
  );
  expect(result.outcome).toBe("displaced");
  expect(result.reasonText).toMatch(/deadline in 3 days and 2 h/);
  expect(result.factors.fairShare).toBe(0.875);
});
it("F-43 returns compatible equipment and follows confirmed winners", () => {
  const equivalent = {
    ...bench,
    id: "b",
    name: "B",
    lab: "Lab B",
    tags: ["logic", "fpga", "board"],
  };
  const other = { ...equivalent, id: "c", category: "computing" };
  const result = findAlternatives(
    base,
    bench,
    [bench, equivalent, other],
    [base],
    now,
  );
  expect(result[0]).toMatchObject({
    equipmentId: "b",
    startAt: base.startAt,
    kind: "equivalent",
  });
  expect(result[1]).toMatchObject({
    equipmentId: "a",
    startAt: base.endAt,
    kind: "same-equipment",
  });
  expect(result).toHaveLength(3);
  expect(jaccard(["x", "x", "y"], ["y"])).toBe(0.5);
  expect(jaccard([], [])).toBe(0);
});
it("F-43 offers a shorter feasible overlap before the deadline", () => {
  const choices = findAlternatives(
    { ...base, deadline: at("05:30") },
    bench,
    [],
    [span("05:00", "06:00")],
    now,
  );
  expect(choices).toEqual([
    expect.objectContaining({ ...span("04:30", "05:00"), kind: "shorter" }),
  ]);
  expect(
    findAlternatives({ ...base, deadline: at("03:00") }, bench, [], [], now),
  ).toEqual([]);
  expect(
    findAlternatives(
      base,
      { ...bench, maxBookingMinutes: 30 },
      [{ ...bench, id: "b", maxBookingMinutes: 30 }],
      [],
      now,
    )[0],
  ).toMatchObject({ kind: "shorter" });
});
