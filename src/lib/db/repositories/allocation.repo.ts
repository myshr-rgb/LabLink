import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DAY_MS } from "@/lib/booking/slots";
import { validWeights } from "@/lib/allocation/score";
import {
  DEFAULT_POLICY,
  FACTOR_KEYS,
  type Candidate,
  type Decision,
  type Factors,
  type Policy,
} from "@/lib/allocation/types";
import { getDb } from "../client";

export interface Conflict {
  id: string;
  equipmentId: string;
  equipmentName: string;
  inChargeId: string;
  startAt: string;
  endAt: string;
  status: "open" | "resolved";
}
interface Evidence extends Candidate {
  userId: string;
  departmentId: string | null;
  label: string;
  status: string;
  cleared: number;
}
export interface SavedDecision extends Omit<Decision, "alternatives"> {
  aiReasonText: string | null;
  finalOutcome: Decision["outcome"] | null;
}
const select = `SELECT g.id,e.id equipmentId,e.name equipmentName,l.in_charge_id inChargeId,g.window_start startAt,g.window_end endAt,g.status
 FROM conflict_groups g JOIN equipment e ON e.id=g.equipment_id JOIN labs l ON l.id=e.lab_id`;
/** List groups for a lab owner or all groups for an administrator. */
export function listConflicts(inCharge: string | null): Conflict[] {
  return getDb()
    .prepare<[string | null, string | null], Conflict>(
      select +
        " WHERE (? IS NULL OR l.in_charge_id=?) ORDER BY g.status,g.window_start,g.id",
    )
    .all(inCharge, inCharge);
}
/** Load the group with its current lab owner. */
export function findConflict(id: string): Conflict | undefined {
  return getDb()
    .prepare<[string], Conflict>(select + " WHERE g.id=?")
    .get(id);
}
const weightsSchema = z
  .strictObject({
    deadline: z.number(),
    priority: z.number(),
    fairShare: z.number(),
    waiting: z.number(),
    reliability: z.number(),
  })
  .refine(validWeights);
/** Read the persisted policy, falling back to the documented defaults. */
export function allocationPolicy(): Policy {
  const row = getDb()
    .prepare<[], { weights: string; weekly_quota_hours: number }>(
      "SELECT weights,weekly_quota_hours FROM policy_config WHERE id=1",
    )
    .get();
  if (!row) return DEFAULT_POLICY;
  const weights = weightsSchema.safeParse(JSON.parse(row.weights));
  return {
    weights: weights.success ? weights.data : DEFAULT_POLICY.weights,
    weeklyQuotaHours:
      row.weekly_quota_hours > 0
        ? row.weekly_quota_hours
        : DEFAULT_POLICY.weeklyQuotaHours,
  };
}
/** Use only historical outcomes prior to the supplied evaluation instant. */
export function conflictEvidence(id: string, now: Date): Evidence[] {
  const iso = (days: number) => new Date(+now - days * DAY_MS).toISOString();
  return getDb()
    .prepare<
      { id: string; now: string; usage: string; history: string },
      Evidence
    >(
      `SELECT b.id,b.user_id userId,u.department_id departmentId,
    coalesce(p.title,u.name) label,b.status,b.start_at startAt,b.end_at endAt,b.created_at createdAt,p.deadline,
    coalesce(p.priority,'normal') priority, (e.requires_incharge_approval=0 OR b.incharge_approved_at IS NOT NULL) cleared,
    coalesce((SELECT sum((julianday(h.end_at)-julianday(max(h.start_at,@usage)))*24) FROM bookings h
      WHERE h.user_id=b.user_id AND h.status='completed' AND h.end_at>@usage AND h.end_at<=@now),0) hoursUsed14d,
    (SELECT count(*) FROM bookings h WHERE h.user_id=b.user_id AND h.status='no_show'
      AND h.start_at>=@history AND h.start_at<@now) noShows60d
    FROM bookings b JOIN equipment e ON e.id=b.equipment_id JOIN users u ON u.id=b.user_id
    LEFT JOIN projects p ON p.id=b.project_id WHERE b.conflict_group_id=@id ORDER BY b.id`,
    )
    .all({ id, now: iso(0), usage: iso(14), history: iso(60) });
}
/** Recall stored explanations and the final outcomes of a resolved group. */
export function savedDecisions(id: string): SavedDecision[] {
  type Row = Omit<SavedDecision, "factors"> & { factors: string };
  return getDb()
    .prepare<[string], Row>(
      `SELECT booking_id bookingId,rank,score,factors,reason_text reasonText,ai_reason_text aiReasonText,
    recommended_outcome outcome,final_outcome finalOutcome FROM allocation_decisions WHERE conflict_group_id=? ORDER BY rank`,
    )
    .all(id)
    .map((row) => ({ ...row, factors: JSON.parse(row.factors) as Factors }));
}
/** Rewrite the open recommendation atomically, preserving matching reviewed phrasing. */
export function saveDecisions(
  group: string,
  decisions: readonly Decision[],
  now: Date,
): void {
  const db = getDb();
  const previous = new Map(
    savedDecisions(group).map((row) => [row.bookingId, row]),
  );
  db.prepare("DELETE FROM allocation_decisions WHERE conflict_group_id=?").run(
    group,
  );
  const insert =
    db.prepare(`INSERT INTO allocation_decisions(id,conflict_group_id,booking_id,rank,score,factors,reason_text,ai_reason_text,source,recommended_outcome,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  for (const row of decisions) {
    const old = previous.get(row.bookingId);
    const phrase =
      old?.reasonText === row.reasonText && old.outcome === row.outcome
        ? old.aiReasonText
        : null;
    const values = Object.fromEntries(
      FACTOR_KEYS.map((key) => [key, row.factors[key]]),
    );
    insert.run(
      randomUUID(),
      group,
      row.bookingId,
      row.rank,
      row.score,
      JSON.stringify(values),
      row.reasonText,
      phrase,
      phrase ? "ai_assisted" : "rules",
      row.outcome,
      now.toISOString(),
    );
  }
}
/** Update only the current matching recommendation after an external AI call. */
export function saveReason(
  group: string,
  row: Decision,
  phrase: string,
): boolean {
  return (
    getDb()
      .prepare(
        `UPDATE allocation_decisions SET ai_reason_text=?,source='ai_assisted' WHERE conflict_group_id=? AND booking_id=?
    AND reason_text=? AND recommended_outcome=? AND final_outcome IS NULL`,
      )
      .run(phrase, group, row.bookingId, row.reasonText, row.outcome)
      .changes === 1
  );
}
/** Record the actual human decision and retain the recommendation for auditing. */
export function finalizeDecision(
  group: string,
  id: string,
  outcome: Decision["outcome"],
  override: { actorId: string; reason: string } | null,
): void {
  getDb()
    .prepare(
      "UPDATE allocation_decisions SET final_outcome=?,overridden_by=?,override_reason=? WHERE conflict_group_id=? AND booking_id=?",
    )
    .run(
      outcome,
      override?.actorId ?? null,
      override?.reason ?? null,
      group,
      id,
    );
}
/** Mark the group resolved by its authorized reviewer. */
export function finishConflict(id: string, actorId: string, now: Date): void {
  getDb()
    .prepare(
      "UPDATE conflict_groups SET status='resolved',resolved_by=?,resolved_at=? WHERE id=?",
    )
    .run(actorId, now.toISOString(), id);
}
