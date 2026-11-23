import { randomUUID } from "node:crypto";
import { assertOwner, requireRole } from "@/lib/auth/guards";
import { initialStatus } from "@/lib/booking/transitions";
import { auditChange } from "@/lib/db/repositories/audit.repo";
import {
  findBooking,
  insertBooking,
  listBookings,
  updateBooking,
} from "@/lib/db/repositories/booking.repo";
import { detachConflict } from "@/lib/db/repositories/conflict.repo";
import { insertNotice } from "@/lib/db/repositories/notification.repo";
import { writeTransaction } from "@/lib/db/repositories/transaction";
import { AppError } from "@/lib/errors";
import type { BookingInput, BookingUpdate } from "@/lib/validation/workflow";
import type { Actor } from "@/types/domain";
import type { Booking } from "@/types/workflow";
import { equipmentDetail } from "./equipment.service";
import { requestProject } from "./project.service";
import { reconsiderLastRequest } from "./booking-confirm";
import { checkWindow } from "./booking-availability";
import { applyEvent, sweepExpired } from "./booking-state";
import { invalidateCatalogue } from "./catalogue-cache";

function requestDetails(
  actor: Actor,
  input: BookingUpdate,
  approval: boolean,
): string | null {
  if (approval && (!input.projectId || !input.justification))
    throw new AppError(
      "VALIDATION_ERROR",
      "Choose a project and explain why you need the equipment.",
    );
  return input.projectId ? requestProject(actor, input.projectId).id : null;
}
function notifyGuide(booking: Booking, now: Date): void {
  if (booking.status === "pending_approval" && booking.guideId)
    insertNotice(
      booking.guideId,
      "booking.request",
      "Access request to review",
      `A student requested ${booking.equipmentName}.`,
      "/approvals",
      now,
    );
}
function bookingById(id: string): Booking {
  const booking = findBooking(id);
  if (!booking) throw new AppError("NOT_FOUND", "Booking unavailable.");
  return booking;
}
function owned(actor: Actor, id: string): Booking {
  const booking = bookingById(id);
  assertOwner(actor, booking.userId);
  return booking;
}
/** List a caller's own bookings after releasing expired slots. */
export function myBookings(actor: Actor | null, now: Date): Booking[] {
  const user = requireRole(actor);
  sweepExpired(now);
  return listBookings(user.userId);
}
/** Read a single booking only for its owner. */
export function bookingDetail(
  actor: Actor | null,
  id: string,
  now: Date,
): Booking {
  const user = requireRole(actor);
  owned(user, id);
  sweepExpired(now);
  return owned(user, id);
}
/** Check overlaps and insert under one immediate SQLite transaction. */
export function createBooking(
  actor: Actor | null,
  input: BookingInput,
  now: Date,
): Booking {
  const user = requireRole(actor, ["student"]);
  sweepExpired(now);
  const result = writeTransaction(() => {
    const item = equipmentDetail(input.equipmentId);
    const approval = item.accessType === "approval";
    const projectId = requestDetails(user, input, approval);
    checkWindow(user, item, input, now);
    const id = randomUUID();
    const status = initialStatus(approval);
    insertBooking(
      { ...input, id, userId: user.userId, projectId, status },
      now,
    );
    auditChange(user.userId, "booking", id, "booking.create", now, {
      to: status,
    });
    const booking = bookingById(id);
    notifyGuide(booking, now);
    return booking;
  });
  invalidateCatalogue();
  return result;
}
/** Modify an owner's future booking or resubmit after requested changes. */
export function modifyBooking(
  actor: Actor | null,
  id: string,
  input: BookingUpdate,
  now: Date,
): Booking {
  const user = requireRole(actor);
  owned(user, id);
  sweepExpired(now);
  const result = writeTransaction(() => {
    const current = owned(user, id);
    if (
      !["changes_requested", "pending_approval", "approved"].includes(
        current.status,
      ) ||
      Date.parse(current.startAt) <= +now
    )
      throw new AppError(
        "INVALID_TRANSITION",
        "This booking can no longer be modified.",
      );
    const item = equipmentDetail(current.equipmentId);
    const approval = item.accessType === "approval";
    const projectId = requestDetails(user, input, approval);
    checkWindow(user, item, input, now, id);
    const status = initialStatus(approval);
    if (current.status === "changes_requested")
      applyEvent(current, "resubmit", user.userId, now, null);
    if (current.conflictGroupId)
      detachConflict(current.id, current.conflictGroupId, now);
    updateBooking({ ...input, id, projectId, status }, now);
    auditChange(user.userId, "booking", id, "booking.modify", now, {
      from: current.status,
      to: status,
    });
    const booking = bookingById(id);
    notifyGuide(booking, now);
    reconsiderLastRequest(current.conflictGroupId, now);
    return booking;
  });
  invalidateCatalogue();
  return result;
}
/** Cancel atomically so the released slot is immediately available. */
export function cancelBooking(
  actor: Actor | null,
  id: string,
  now: Date,
): Booking {
  const user = requireRole(actor);
  owned(user, id);
  sweepExpired(now);
  const result = writeTransaction(() => {
    const current = owned(user, id);
    applyEvent(current, "cancel", user.userId, now);
    reconsiderLastRequest(current.conflictGroupId, now);
    return bookingById(id);
  });
  invalidateCatalogue();
  return result;
}
