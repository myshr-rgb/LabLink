import type { BookingStatus } from "@/types/domain";

const transitions = {
  pending_approval: {
    facultyApprove: "faculty_approved",
    facultyReject: "rejected",
    requestChanges: "changes_requested",
    cancel: "cancelled",
  },
  changes_requested: { resubmit: "pending_approval", cancel: "cancelled" },
  faculty_approved: {
    inchargeApprove: "faculty_approved",
    inchargeReject: "rejected",
    confirm: "approved",
    displace: "displaced",
    cancel: "cancelled",
  },
  approved: {
    maintenance: "displaced",
    checkIn: "checked_in",
    expire: "no_show",
    cancel: "cancelled",
  },
  checked_in: { checkOut: "completed" },
} satisfies Partial<Record<BookingStatus, Record<string, BookingStatus>>>;
type EventMap = typeof transitions;
export type BookingEvent = {
  [Status in keyof EventMap]: keyof EventMap[Status];
}[keyof EventMap];
const table: Partial<
  Record<BookingStatus, Partial<Record<BookingEvent, BookingStatus>>>
> = transitions;
export const NO_SHOW_GRACE_MS = 15 * 60_000;

/** The service authorizes the actor before applying an allowed state change. */
export function nextStatus(
  status: BookingStatus,
  event: BookingEvent,
): BookingStatus | undefined {
  return table[status]?.[event];
}

/** Open and department-only items confirm immediately when the caller qualifies. */
export function initialStatus(needsApproval: boolean): BookingStatus {
  return needsApproval ? "pending_approval" : "approved";
}
