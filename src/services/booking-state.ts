import { auditChange } from "@/lib/db/repositories/audit.repo";
import {
  expiredBookings,
  setBookingStatus,
} from "@/lib/db/repositories/booking.repo";
import { detachConflict } from "@/lib/db/repositories/conflict.repo";
import { writeTransaction } from "@/lib/db/repositories/transaction";
import {
  nextStatus,
  NO_SHOW_GRACE_MS,
  type BookingEvent,
} from "@/lib/booking/transitions";
import { AppError } from "@/lib/errors";
import type { BookingStatus } from "@/types/domain";
import type { Booking } from "@/types/workflow";
import { invalidateCatalogue } from "./catalogue-cache";

/** Reject invalid events before applying and auditing the transition. */
export function applyEvent(
  booking: Booking,
  event: BookingEvent,
  actorId: string | null,
  now: Date,
  note = booking.decisionNote,
): BookingStatus {
  const status = nextStatus(booking.status, event);
  if (!status)
    throw new AppError(
      "INVALID_TRANSITION",
      "This booking can no longer be changed.",
    );
  setBookingStatus(booking.id, status, note, now);
  if (booking.conflictGroupId && status !== "faculty_approved")
    detachConflict(booking.id, booking.conflictGroupId, now);
  auditChange(actorId, "booking", booking.id, event, now, {
    from: booking.status,
    to: status,
  });
  return status;
}

/** Release confirmed slots after the check-in grace period. */
export function sweepExpired(now: Date): void {
  const cutoff = new Date(+now - NO_SHOW_GRACE_MS).toISOString();
  if (!expiredBookings(cutoff).length) return;
  const count = writeTransaction(() => {
    const expired = expiredBookings(cutoff);
    for (const id of expired) {
      setBookingStatus(id, "no_show", null, now);
      auditChange(null, "booking", id, "expire", now, {
        from: "approved",
        to: "no_show",
      });
    }
    return expired.length;
  });
  if (count) invalidateCatalogue();
}
