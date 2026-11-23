import { requireRole } from "@/lib/auth/guards";
import { approvalQueue, findBooking } from "@/lib/db/repositories/booking.repo";
import { insertNotice } from "@/lib/db/repositories/notification.repo";
import { writeTransaction } from "@/lib/db/repositories/transaction";
import { AppError } from "@/lib/errors";
import type { Decision } from "@/lib/validation/workflow";
import type { Actor } from "@/types/domain";
import type { Booking } from "@/types/workflow";
import { reconsiderLastRequest, tryConfirm } from "./booking-confirm";
import { applyEvent, sweepExpired } from "./booking-state";
import { invalidateCatalogue } from "./catalogue-cache";

const TITLES = {
  approved: "Booking approved",
  faculty_approved: "Faculty approved your request",
  rejected: "Request rejected",
  changes_requested: "Changes requested",
} as const;
/** List only pending requests assigned to the caller, or all pending requests for admin. */
export function approvals(actor: Actor | null): Booking[] {
  const user = requireRole(actor, ["faculty", "admin"]);
  return approvalQueue(user.role === "admin" ? null : user.userId);
}
/** Authorize against the current guide and decide within one write transaction. */
export function decide(
  actor: Actor | null,
  id: string,
  input: Decision,
  now: Date,
): Booking {
  const user = requireRole(actor, ["faculty", "admin"]);
  sweepExpired(now);
  const result = writeTransaction(() => {
    const current = findBooking(id);
    if (
      !current ||
      !current.guideId ||
      (user.role !== "admin" && current.guideId !== user.userId)
    )
      throw new AppError("NOT_FOUND", "Request unavailable.");
    if (input.decision !== "approve" && !input.comment)
      throw new AppError("VALIDATION_ERROR", "Add a comment for the student.");
    if (input.decision === "approve" && Date.parse(current.startAt) <= +now)
      throw new AppError(
        "INVALID_TRANSITION",
        "This request's start time has passed.",
      );
    const event =
      input.decision === "approve"
        ? "facultyApprove"
        : input.decision === "reject"
          ? "facultyReject"
          : "requestChanges";
    const status = applyEvent(
      current,
      event,
      user.userId,
      now,
      input.comment || null,
    );
    const final =
      status === "faculty_approved"
        ? tryConfirm(
            { ...current, status, decisionNote: input.comment || null },
            now,
          )
        : status;
    if (final !== "faculty_approved")
      reconsiderLastRequest(current.conflictGroupId, now);
    if (final in TITLES)
      insertNotice(
        current.userId,
        "booking.decision",
        TITLES[final as keyof typeof TITLES],
        input.comment || current.equipmentName,
        "/bookings",
        now,
      );
    return findBooking(id)!;
  });
  invalidateCatalogue();
  return result;
}
