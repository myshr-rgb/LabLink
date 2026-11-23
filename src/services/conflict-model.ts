import { createHash } from "node:crypto";
import { allocate, intersect } from "@/lib/allocation/allocate";
import { findAlternatives, type Resource } from "@/lib/allocation/alternatives";
import type { Decision } from "@/lib/allocation/types";
import { DAY_MS, type Window } from "@/lib/booking/slots";
import {
  allocationPolicy,
  conflictEvidence,
  type Conflict,
} from "@/lib/db/repositories/allocation.repo";
import { blockingWindows } from "@/lib/db/repositories/availability.repo";
import {
  findEquipment,
  findEquipmentList,
} from "@/lib/db/repositories/equipment.repo";

export interface Ranked extends Decision {
  label: string;
  startAt: string;
  endAt: string;
  aiReasonText?: string | null;
  finalOutcome?: Decision["outcome"] | null;
}
/** Build the window, history and resource snapshot under the caller's write lock. */
export function buildRecommendation(group: Conflict, now: Date) {
  const evidence = conflictEvidence(group.id, now);
  const original = findEquipment(group.equipmentId);
  const range = {
    startAt: group.startAt,
    endAt: new Date(
      Math.max(+now, Date.parse(group.endAt)) + 7 * DAY_MS,
    ).toISOString(),
  };
  const blocks = blockingWindows(range);
  const eligible = evidence.filter(
    (row) => row.status === "faculty_approved" && row.cleared,
  );
  const awaiting = evidence
    .filter(
      (row) =>
        row.status === "pending_approval" ||
        (row.status === "faculty_approved" && !row.cleared),
    )
    .map(({ id, label, status }) => ({ id, label, status }));
  const related = original
    ? findEquipmentList({ category: original.category }).filter(
        (item) => item.status === "available",
      )
    : [];
  const base = blocks.get(group.equipmentId) ?? [];
  const unavailable = eligible
    .filter(
      (row) =>
        !original ||
        original.status !== "available" ||
        Date.parse(row.startAt) <= +now,
    )
    .map((row) => ({ startAt: row.startAt, endAt: row.endAt }));
  const blocked = [...base, ...unavailable];
  function alternativesFor(
    row: (typeof eligible)[number],
    winners: readonly Window[],
  ): Decision["alternatives"] {
    if (!original) return [];
    const resource = (item: typeof original): Resource => ({
      ...item,
      blocks: blocks.get(item.id) ?? [],
    });
    const same = resource(original);
    if (original.status !== "available")
      same.blocks = [...same.blocks, { ...range, state: "maintenance" }];
    const allowed = related.filter(
      (item) =>
        item.accessType !== "dept_only" ||
        item.departmentId === row.departmentId,
    );
    return findAlternatives(row, same, allowed.map(resource), winners, now);
  }
  const byId = new Map(eligible.map((row) => [row.id, row]));
  const rows = allocate(
    eligible,
    allocationPolicy(),
    now,
    blocked,
    (row, winners) => alternativesFor(byId.get(row.id)!, winners),
  );
  const ranked: Ranked[] = rows.map((row) => ({
    ...row,
    label: byId.get(row.bookingId)!.label,
    startAt: byId.get(row.bookingId)!.startAt,
    endAt: byId.get(row.bookingId)!.endAt,
  }));
  const signature = ranked.map((row) => [
    row.bookingId,
    row.startAt,
    row.endAt,
    row.outcome,
  ]);
  const revision = createHash("sha256")
    .update(JSON.stringify([signature, awaiting.map((row) => row.id)]))
    .digest("hex");
  return { ranked, awaiting, eligible, blocked, revision, alternativesFor };
}
/** Check a set against all blockers and against itself. */
export function feasible(
  winners: readonly Window[],
  blocked: readonly Window[],
): boolean {
  return winners.every(
    (row, index) =>
      ![...blocked, ...winners.slice(0, index)].some((window) =>
        intersect(row, window),
      ),
  );
}
