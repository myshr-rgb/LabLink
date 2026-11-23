import { requireRole } from "@/lib/auth/guards";
import {
  listNotices,
  readNotice,
  unreadNotices,
} from "@/lib/db/repositories/notification.repo";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/types/domain";
import type { Notification } from "@/types/workflow";

/** Return a recipient's notices and unread count. */
export function notifications(actor: Actor | null): {
  items: Notification[];
  unread: number;
} {
  const items = listNotices(requireRole(actor).userId);
  return { items, unread: items.filter((item) => !item.readAt).length };
}
/** Mark a notice as read only for its recipient. */
export function markRead(actor: Actor | null, id: string, now: Date): null {
  if (!readNotice(requireRole(actor).userId, id, now))
    throw new AppError("NOT_FOUND", "Notification unavailable.");
  return null;
}

/** Return the count for the authenticated header and polling endpoint. */
export function unreadNotificationCount(actor: Actor | null): number {
  return unreadNotices(requireRole(actor).userId);
}
