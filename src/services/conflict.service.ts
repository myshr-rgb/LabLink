import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth/guards";
import { auditChange } from "@/lib/db/repositories/audit.repo";
import {
  conflictEvidence,
  finalizeDecision,
  findConflict,
  finishConflict,
  listConflicts,
  saveDecisions,
  savedDecisions,
  type Conflict,
} from "@/lib/db/repositories/allocation.repo";
import { findBooking } from "@/lib/db/repositories/booking.repo";
import {
  competingCluster,
  persistConflict,
} from "@/lib/db/repositories/conflict.repo";
import { insertNotice } from "@/lib/db/repositories/notification.repo";
import { writeTransaction } from "@/lib/db/repositories/transaction";
import { AppError } from "@/lib/errors";
import type { Alternative } from "@/lib/allocation/types";
import type { Resolution } from "@/lib/validation/conflict";
import { windowLabel } from "@/lib/utils/format";
import type { Actor } from "@/types/domain";
import type { Equipment } from "@/types/equipment";
import type { Booking } from "@/types/workflow";
import { applyEvent } from "./booking-state";
import { invalidateCatalogue } from "./catalogue-cache";
import { buildRecommendation, feasible, type Ranked } from "./conflict-model";

export interface ConflictReview {
  group: Conflict;
  ranked: Ranked[];
  awaiting: { id: string; label: string; status: string }[];
  revision: string;
}
/** Enforce lab ownership without disclosing foreign conflicts. */
export function authorizedConflict(actor: Actor | null, id: string): Conflict {
  const user = requireRole(actor, ["incharge", "admin"]);
  const group = findConflict(id);
  if (!group || (user.role !== "admin" && group.inChargeId !== user.userId))
    throw new AppError("NOT_FOUND", "Conflict unavailable.");
  return group;
}
/** List only conflicts from the reviewer's labs. */
export function conflicts(actor: Actor | null): Conflict[] {
  const user = requireRole(actor, ["incharge", "admin"]);
  return listConflicts(user.role === "admin" ? null : user.userId);
}
/** Attach overlapping requests and persist fresh deterministic decisions atomically with approval. */
export function attachConflict(
  item: Equipment,
  booking: Booking,
  now: Date,
): boolean {
  const cluster = competingCluster(item.id, booking.id);
  if (cluster.length < 2) return false;
  const existing = cluster.find((candidate) => candidate.groupId)?.groupId;
  const id = existing ?? randomUUID();
  persistConflict(id, item.id, cluster, now);
  const group = findConflict(id)!;
  saveDecisions(id, buildRecommendation(group, now).ranked, now);
  if (!existing)
    insertNotice(
      item.inChargeId,
      "booking.conflict",
      "Overlapping access requests",
      `Requests overlap for ${item.name}.`,
      `/conflicts/${id}`,
      now,
    );
  return true;
}
/** Refresh open recommendations and expose retained outcomes for closed groups. */
export function reviewConflict(
  actor: Actor | null,
  id: string,
  now: Date,
): ConflictReview {
  return writeTransaction(() => {
    const group = authorizedConflict(actor, id);
    const snapshot = buildRecommendation(group, now);
    if (group.status === "open") saveDecisions(id, snapshot.ranked, now);
    const evidence = new Map(
      conflictEvidence(id, now).map((row) => [row.id, row]),
    );
    const stored = savedDecisions(id);
    const ranked =
      group.status === "open"
        ? snapshot.ranked.map((row) => ({
            ...row,
            aiReasonText: stored.find(
              (item) => item.bookingId === row.bookingId,
            )?.aiReasonText,
          }))
        : stored.flatMap((row) => {
            const candidate = evidence.get(row.bookingId);
            return candidate
              ? [
                  {
                    ...row,
                    label: candidate.label,
                    startAt: candidate.startAt,
                    endAt: candidate.endAt,
                    alternatives: [],
                  },
                ]
              : [];
          });
    return {
      group,
      ranked,
      awaiting: snapshot.awaiting,
      revision: snapshot.revision,
    };
  });
}
/** Make a prefilled request link. The normal booking endpoint rechecks the slot. */
export function alternativeLink(alternative: Alternative): string {
  const params = new URLSearchParams({
    start: alternative.startAt,
    end: alternative.endAt,
  });
  return `/equipment/${alternative.equipmentId}?${params}`;
}
function chooseWinners(
  snapshot: ReturnType<typeof buildRecommendation>,
  input: Resolution,
): Set<string> {
  if (input.revision && input.revision !== snapshot.revision)
    throw new AppError(
      "INVALID_TRANSITION",
      "The recommendation changed. Reload this review.",
    );
  const ids =
    input.action === "accept"
      ? snapshot.ranked
          .filter((row) => row.outcome === "approved")
          .map((row) => row.bookingId)
      : (input.winnerIds ?? []);
  if (
    input.action === "override" &&
    ((input.reason?.trim().length ?? 0) < 10 ||
      (input.reason?.trim().length ?? 0) > 500)
  )
    throw new AppError(
      "VALIDATION_ERROR",
      "Provide an override reason between 10 and 500 characters.",
    );
  if (input.action === "override" && !input.winnerIds)
    throw new AppError("VALIDATION_ERROR", "Choose which requests to approve.");
  const selected = new Set(ids);
  const winners = snapshot.eligible.filter((row) => selected.has(row.id));
  if (
    selected.size !== ids.length ||
    winners.length !== ids.length ||
    !feasible(winners, snapshot.blocked)
  )
    throw new AppError(
      "VALIDATION_ERROR",
      "Choose eligible requests with times that do not overlap.",
    );
  return selected;
}
function notify(
  group: Conflict,
  booking: Booking,
  options: Alternative[],
  approved: boolean,
  now: Date,
): void {
  if (approved) {
    insertNotice(
      booking.userId,
      "conflict.approved",
      "Booking approved",
      group.equipmentName,
      "/bookings",
      now,
    );
    return;
  }
  if (!options.length)
    insertNotice(
      booking.userId,
      "conflict.displaced",
      "Choose another time",
      "No alternative is available within the current request window.",
      `/equipment/${group.equipmentId}`,
      now,
    );
  for (const option of options)
    insertNotice(
      booking.userId,
      "conflict.alternative",
      "Request alternative",
      `${option.equipmentName} · ${option.lab} · ${windowLabel(option.startAt, option.endAt)}`,
      alternativeLink(option),
      now,
    );
}
/** Apply a validated staff decision, notifications and its audit snapshot together. */
export function resolveConflict(
  actor: Actor | null,
  id: string,
  input: Resolution,
  now: Date,
): { approved: string[]; displaced: string[] } {
  const user = requireRole(actor, ["incharge", "admin"]);
  const result = writeTransaction(() => {
    const group = authorizedConflict(user, id);
    if (group.status !== "open")
      throw new AppError(
        "INVALID_TRANSITION",
        "This conflict has already been resolved.",
      );
    const snapshot = buildRecommendation(group, now);
    if (!snapshot.ranked.length)
      throw new AppError(
        "INVALID_TRANSITION",
        "No requests are ready for resolution.",
      );
    const selected = chooseWinners(snapshot, input);
    const winners = snapshot.eligible.filter((row) => selected.has(row.id));
    saveDecisions(id, snapshot.ranked, now);
    const override =
      input.action === "override"
        ? { actorId: user.userId, reason: input.reason!.trim() }
        : null;
    const displaced: string[] = [];
    for (const row of snapshot.eligible) {
      const booking = findBooking(row.id)!;
      const approved = selected.has(row.id);
      applyEvent(
        { ...booking, conflictGroupId: null },
        approved ? "confirm" : "displace",
        user.userId,
        now,
      );
      finalizeDecision(
        id,
        row.id,
        approved ? "approved" : "displaced",
        override,
      );
      const alternatives = approved
        ? []
        : snapshot.alternativesFor(row, winners);
      notify(group, booking, alternatives, approved, now);
      if (!approved) displaced.push(row.id);
    }
    finishConflict(id, user.userId, now);
    auditChange(user.userId, "conflict", id, `conflict.${input.action}`, now, {
      recommendation: savedDecisions(id),
      approved: [...selected],
      displaced,
      reason: override?.reason,
    });
    return { approved: [...selected], displaced };
  });
  invalidateCatalogue();
  return result;
}
