import type { BookingStatus } from "@/types/domain";
import type { Booking } from "@/types/workflow";
import { getDb } from "../client";

interface Row {
  id: string;
  equipment_id: string;
  equipment_name: string;
  user_id: string;
  student_name: string;
  project_id: string | null;
  project_title: string | null;
  deadline: string | null;
  guide_id: string | null;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  justification: string;
  decision_note: string | null;
  incharge_approved_at: string | null;
  conflict_group_id: string | null;
}
const SELECT = `SELECT b.*,e.name equipment_name,u.name student_name,p.title project_title,p.deadline,p.guide_id
 FROM bookings b JOIN equipment e ON e.id=b.equipment_id JOIN users u ON u.id=b.user_id LEFT JOIN projects p ON p.id=b.project_id`;
function map(r: Row): Booking {
  return {
    id: r.id,
    equipmentId: r.equipment_id,
    equipmentName: r.equipment_name,
    userId: r.user_id,
    studentName: r.student_name,
    projectId: r.project_id,
    projectTitle: r.project_title,
    deadline: r.deadline,
    guideId: r.guide_id,
    startAt: r.start_at,
    endAt: r.end_at,
    status: r.status,
    justification: r.justification,
    decisionNote: r.decision_note,
    inchargeApprovedAt: r.incharge_approved_at,
    conflictGroupId: r.conflict_group_id,
  };
}
/** Read the booking with the current faculty assignment. */
export function findBooking(id: string): Booking | undefined {
  const row = getDb()
    .prepare<[string], Row>(SELECT + " WHERE b.id=?")
    .get(id);
  if (row) return map(row);
}
/** Read a user's own bookings. */
export function listBookings(userId: string): Booking[] {
  return getDb()
    .prepare<[string], Row>(
      SELECT + " WHERE b.user_id=? ORDER BY b.start_at,b.id",
    )
    .all(userId)
    .map(map);
}
/** Faculty see only their own pending decisions. */
export function approvalQueue(guideId: string | null): Booking[] {
  return getDb()
    .prepare<[string | null, string | null], Row>(
      SELECT +
        " WHERE b.status='pending_approval' AND (? IS NULL OR p.guide_id=?) ORDER BY b.created_at,b.id",
    )
    .all(guideId, guideId)
    .map(map);
}
/** List stale approved holds eligible for no-show. */
export function expiredBookings(cutoff: string): string[] {
  return getDb()
    .prepare<[string], { id: string }>(
      "SELECT id FROM bookings WHERE status='approved' AND start_at<=?",
    )
    .all(cutoff)
    .map((row) => row.id);
}
/** Insert a booking inside the caller's availability transaction. */
export function insertBooking(
  b: Pick<
    Booking,
    | "id"
    | "equipmentId"
    | "userId"
    | "projectId"
    | "startAt"
    | "endAt"
    | "justification"
    | "status"
  >,
  now: Date,
): void {
  getDb()
    .prepare(
      `INSERT INTO bookings(id,equipment_id,user_id,project_id,start_at,end_at,justification,status,created_at,updated_at)
    VALUES (@id,@equipmentId,@userId,@projectId,@startAt,@endAt,@justification,@status,@now,@now)`,
    )
    .run({ ...b, now: now.toISOString() });
}
/** Persist a transition after the service validates it. */
export function setBookingStatus(
  id: string,
  status: BookingStatus,
  note: string | null,
  now: Date,
): void {
  getDb()
    .prepare(
      "UPDATE bookings SET status=?,decision_note=?,updated_at=? WHERE id=?",
    )
    .run(status, note, now.toISOString(), id);
}
/** Change the editable fields in place, clearing old approval and conflict state. */
export function updateBooking(
  b: Pick<
    Booking,
    "id" | "projectId" | "startAt" | "endAt" | "justification" | "status"
  >,
  now: Date,
): void {
  getDb()
    .prepare(
      `UPDATE bookings SET project_id=@projectId,start_at=@startAt,end_at=@endAt,justification=@justification,status=@status,
    decision_note=NULL,incharge_approved_at=NULL,conflict_group_id=NULL,updated_at=@now WHERE id=@id`,
    )
    .run({ ...b, now: now.toISOString() });
}
