import Link from "next/link";
import { z } from "zod";
import { CancelBooking } from "@/components/booking/CancelBooking";
import { card, EmptyState, page, secondary } from "@/components/ui/workflow-ui";
import { windowLabel } from "@/lib/utils/format";
import { myBookings } from "@/services/booking.service";
import { signedInViewer } from "@/services/viewer.service";
import type { BookingStatus } from "@/types/domain";

export const metadata = { title: "My bookings · LabLink" };
const pending: BookingStatus[] = [
  "pending_approval",
  "faculty_approved",
  "changes_requested",
];
const upcoming: BookingStatus[] = ["approved", "checked_in"];
const tabs = ["Upcoming", "Pending", "Past"] as const;
const query = z.strictObject({ view: z.enum(tabs).default("Upcoming") });
const statusLabels: Record<BookingStatus, string> = {
  pending_approval: "Awaiting faculty approval",
  changes_requested: "Changes requested",
  faculty_approved: "Faculty approved",
  approved: "Approved",
  checked_in: "Checked in",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  no_show: "No-show",
  displaced: "Choose another time",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, unknown>>;
}): Promise<React.JSX.Element> {
  const actor = await signedInViewer();
  const now = new Date();
  const parsed = query.safeParse(await searchParams);
  const view = parsed.success ? parsed.data.view : "Upcoming";
  const items = myBookings(actor, now).filter(
    (item) =>
      view ===
      (pending.includes(item.status)
        ? "Pending"
        : upcoming.includes(item.status)
          ? "Upcoming"
          : "Past"),
  );
  return (
    <main id="content" className={page + " space-y-5"}>
      <h1 className="text-3xl font-semibold">My bookings</h1>
      <nav aria-label="Booking views" className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/bookings?view=${tab}`}
            aria-current={tab === view ? "page" : undefined}
            className={
              secondary + (tab === view ? " border-accent text-accent" : "")
            }
          >
            {tab}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState href="/equipment" label="Find equipment">
          There are no {view.toLowerCase()} bookings.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className={card + " space-y-2"}>
              <h2 className="text-lg font-semibold">{item.equipmentName}</h2>
              <p>{windowLabel(item.startAt, item.endAt)}</p>
              <p>
                <span aria-hidden="true">● </span>
                {statusLabels[item.status]}
              </p>
              {item.decisionNote && (
                <p className="text-text-muted">
                  Guide feedback: {item.decisionNote}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {["pending_approval", "changes_requested", "approved"].includes(
                  item.status,
                ) &&
                  Date.parse(item.startAt) > +now && (
                    <Link
                      className={secondary}
                      href={`/equipment/${item.equipmentId}?booking=${item.id}`}
                    >
                      {item.status === "changes_requested"
                        ? "Edit and resubmit"
                        : "Modify booking"}
                    </Link>
                  )}
                {(pending.includes(item.status) ||
                  item.status === "approved") && <CancelBooking id={item.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
