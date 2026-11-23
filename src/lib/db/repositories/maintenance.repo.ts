import { randomUUID } from "node:crypto";
import type { Window } from "@/lib/booking/slots";
import { getDb } from "../client";

/** Add a maintenance hold while the caller holds the scheduling transaction. */
export function insertMaintenance(
  item: string,
  window: Window,
  reason: string,
  actor: string,
): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO maintenance_blocks(id,equipment_id,start_at,end_at,reason,created_by) VALUES (?,?,?,?,?,?)",
    )
    .run(id, item, window.startAt, window.endAt, reason, actor);
  return id;
}
/** Find confirmed bookings intersecting a maintenance hold. */
export function affectedBookings(
  item: string,
  window: Window,
): { id: string; status: "approved" | "checked_in" }[] {
  return getDb()
    .prepare<
      [string, string, string],
      { id: string; status: "approved" | "checked_in" }
    >(
      "SELECT id,status FROM bookings WHERE equipment_id=? AND status IN ('approved','checked_in') AND start_at<? AND end_at>? ORDER BY id",
    )
    .all(item, window.endAt, window.startAt);
}
