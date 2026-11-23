import { blockingWindows } from "@/lib/db/repositories/availability.repo";
import {
  detachConflict,
  remainingConflictMembers,
} from "@/lib/db/repositories/conflict.repo";
import { findBooking } from "@/lib/db/repositories/booking.repo";
import { insertNotice } from "@/lib/db/repositories/notification.repo";
import type { Booking } from "@/types/workflow";
import { attachConflict } from "./conflict.service";
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
  if (attachConflict(item, booking, now)) return booking.status;
  return applyEvent(booking, "confirm", null, now);
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
