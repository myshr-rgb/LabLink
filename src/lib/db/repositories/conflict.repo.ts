import { getDb } from "../client";
import type { Window } from "@/lib/booking/slots";

interface Candidate extends Window {
  id: string;
  groupId: string | null;
}
/** Find the entire connected set of overlapping soft holds for one item. */
export function competingCluster(equipmentId: string, id: string): Candidate[] {
  return getDb()
    .prepare<[string, string], Candidate>(
      `WITH RECURSIVE cluster(id,start_at,end_at) AS (
    SELECT id,start_at,end_at FROM bookings WHERE id=?
    UNION SELECT b.id,b.start_at,b.end_at FROM bookings b JOIN cluster c
      ON b.start_at<c.end_at AND b.end_at>c.start_at
      WHERE b.equipment_id=? AND b.status IN ('pending_approval','faculty_approved'))
    SELECT c.id,c.start_at startAt,c.end_at endAt,g.id groupId FROM cluster c JOIN bookings b ON b.id=c.id
    LEFT JOIN conflict_groups g ON g.id=b.conflict_group_id AND g.status='open' ORDER BY c.id`,
    )
    .all(id, equipmentId);
}
/** Write a group's current bounds and atomically attach its members. */
export function persistConflict(
  id: string,
  equipmentId: string,
  cluster: Candidate[],
  now: Date,
): void {
  const db = getDb();
  const start = cluster.map((row) => row.startAt).sort()[0];
  const end = cluster
    .map((row) => row.endAt)
    .sort()
    .at(-1);
  db.prepare(
    `INSERT INTO conflict_groups(id,equipment_id,window_start,window_end,status,created_at) VALUES (?,?,?,?,'open',?)
    ON CONFLICT(id) DO UPDATE SET window_start=excluded.window_start,window_end=excluded.window_end`,
  ).run(id, equipmentId, start, end, now.toISOString());
  const attach = db.prepare(
    "UPDATE bookings SET conflict_group_id=? WHERE id=?",
  );
  for (const member of cluster) attach.run(id, member.id);
  const close =
    db.prepare(`UPDATE conflict_groups SET status='resolved',resolved_at=? WHERE id=? AND NOT EXISTS
    (SELECT 1 FROM bookings WHERE conflict_group_id=? AND status IN ('pending_approval','faculty_approved'))`);
  for (const other of new Set(cluster.map((row) => row.groupId))) {
    if (other && other !== id) close.run(now.toISOString(), other, other);
  }
}
/** Detach a settled booking and close a group when no competing members remain. */
export function detachConflict(id: string, group: string, now: Date): void {
  const db = getDb();
  db.prepare("UPDATE bookings SET conflict_group_id=NULL WHERE id=?").run(id);
  db.prepare(
    `UPDATE conflict_groups SET status='resolved',resolved_at=? WHERE id=? AND status='open' AND NOT EXISTS
    (SELECT 1 FROM bookings WHERE conflict_group_id=? AND status IN ('pending_approval','faculty_approved'))`,
  ).run(now.toISOString(), group, group);
}

/** Read the remaining current members after a request changes or leaves a group. */
export function remainingConflictMembers(groupId: string): string[] {
  return getDb()
    .prepare<[string], { id: string }>(
      "SELECT id FROM bookings WHERE conflict_group_id=? AND status IN ('pending_approval','faculty_approved') ORDER BY id",
    )
    .all(groupId)
    .map((row) => row.id);
}
