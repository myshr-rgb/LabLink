import Link from "next/link";
import { MarkNotification } from "@/components/layout/MarkNotification";
import { card, EmptyState, page } from "@/components/ui/workflow-ui";
import { campusTime, dayLabel } from "@/lib/utils/format";
import { notifications } from "@/services/notification.service";
import { signedInViewer } from "@/services/viewer.service";

export const metadata = { title: "Notifications · LabLink" };
export default async function NotificationsPage(): Promise<React.JSX.Element> {
  const { items, unread } = notifications(await signedInViewer());
  return (
    <main id="content" className={page + " space-y-5"}>
      <h1 className="text-3xl font-semibold">Notifications</h1>
      <p role="status">{unread} unread</p>
      {items.length === 0 ? (
        <EmptyState>You have no notifications yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className={card + " space-y-2"}>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="whitespace-pre-wrap break-words">{item.body}</p>
              <p className="text-sm text-text-muted">
                {dayLabel(item.createdAt)}, {campusTime(item.createdAt)} IST ·{" "}
                {item.readAt ? "Read" : "Unread"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {item.link && item.link !== "/notifications" && (
                  <Link
                    className="inline-flex min-h-11 items-center text-accent underline"
                    href={item.link}
                  >
                    {item.title === "Request alternative"
                      ? "Request alternative"
                      : "View details"}
                  </Link>
                )}
                {!item.readAt && <MarkNotification id={item.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
