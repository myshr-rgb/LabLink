import { randomUUID } from "node:crypto";
import { blockingWindows } from "@/lib/db/repositories/availability.repo";
import {
  competingCluster,
  detachConflict,
  remainingConflictMembers,
  persistConflict,
} from "@/lib/db/repositories/conflict.repo";
import { findBooking } from "@/lib/db/repositories/booking.repo";
import { insertNotice } from "@/lib/db/repositories/notification.repo";
import type { Booking } from "@/types/workflow";
import { applyEvent } from "./booking-state";
import { equipmentDetail } from "./equipment.service";
import { alternatives } from "./booking-availability";

/** Decide whether a faculty-approved request can confirm, inside the caller's transaction. */
export function tryConfirm(booking: Booking, now: Date): Booking["status"] {
  const item = equipmentDetail(booking.equipmentId);
  if (
    item.status !== "available" ||
    blockingWindows(booking, item.id, booking.id).has(item.id)
  ) {
    const nearby =
      item.status === "available"
        ? alternatives(item, booking, now, booking.id)
        : [];
    const note = nearby.length
      ? "Another booking or maintenance blocks that time. Choose a nearby available slot."
      : "This time is unavailable. Check the equipment schedule for another slot.";
    insertNotice(
      booking.userId,
      "booking.displaced",
      "Choose another time",
      note,
      `/equipment/${item.id}`,
      now,
    );
    return applyEvent(booking, "displace", null, now, note);
  }
  if (item.requiresInchargeApproval && !booking.inchargeApprovedAt)
    return booking.status;
  const cluster = competingCluster(item.id, booking.id);
  if (cluster.length <= 1) return applyEvent(booking, "confirm", null, now);
  const existing = cluster.find((candidate) => candidate.groupId)?.groupId;
  persistConflict(existing ?? randomUUID(), item.id, cluster, now);
  if (!existing)
    insertNotice(
      item.inChargeId,
      "booking.conflict",
      "Overlapping access requests",
      `Requests overlap for ${item.name}.`,
      "/notifications",
      now,
    );
  return booking.status;
}

/** Reconsider a group's last remaining request after another one leaves. */
export function reconsiderLastRequest(groupId: string | null, now: Date): void {
  if (!groupId) return;
  const members = remainingConflictMembers(groupId);
  if (members.length !== 1) return;
  const booking = findBooking(members[0]);
  if (!booking) return;
  detachConflict(booking.id, groupId, now);
  if (
    booking.status !== "faculty_approved" ||
    Date.parse(booking.startAt) <= +now
  )
    return;
  const result = tryConfirm({ ...booking, conflictGroupId: null }, now);
  if (result === "approved")
    insertNotice(
      booking.userId,
      "booking.decision",
      "Booking approved",
      booking.equipmentName,
      "/bookings",
      now,
    );
}
