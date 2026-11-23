import { randomUUID } from "node:crypto";
import type { Notification } from "@/types/workflow";
import { getDb } from "../client";

interface Row {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
/** Insert a notification atomically with the originating workflow action. */
export function insertNotice(
  userId: string,
  type: string,
  title: string,
  body: string,
  link: string,
  now: Date,
): void {
  getDb()
    .prepare(
      "INSERT INTO notifications(id,user_id,type,title,body,link,created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .run(randomUUID(), userId, type, title, body, link, now.toISOString());
}
/** Read notifications scoped to the authenticated recipient. */
export function listNotices(userId: string): Notification[] {
  return getDb()
    .prepare<[string], Row>(
      "SELECT id,title,body,link,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC,id",
    )
    .all(userId)
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      link: row.link,
      readAt: row.read_at,
      createdAt: row.created_at,
    }));
}
/** Mark a recipient's notice as read, preserving the original read timestamp. */
export function readNotice(userId: string, id: string, now: Date): boolean {
  return (
    getDb()
      .prepare(
        "UPDATE notifications SET read_at=coalesce(read_at,?) WHERE user_id=? AND id=?",
      )
      .run(now.toISOString(), userId, id).changes === 1
  );
}

/** Count unread items without loading the recipient's message history. */
export function unreadNotices(userId: string): number {
  return getDb()
    .prepare<[string], { total: number }>(
      "SELECT count(*) total FROM notifications WHERE user_id=? AND read_at IS NULL",
    )
    .get(userId)!.total;
}
