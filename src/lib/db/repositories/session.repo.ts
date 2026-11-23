import type { Actor, Role } from "@/types/domain";
import { getDb } from "../client";

/** Refresh idle time only for active accounts within both session lifetimes. */
export function refreshSession(
  hash: string,
  now: Date,
  db = getDb(),
): Actor | null {
  const hour = 3_600_000;
  return db
    .transaction(() => {
      const row = db
        .prepare<
          [string, string, string, string],
          { user_id: string; role: Role }
        >(
          `SELECT s.user_id, u.role FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.id_hash = ? AND s.expires_at > ? AND s.last_seen_at > ? AND s.created_at > ? AND u.status = 'active'`,
        )
        .get(
          hash,
          now.toISOString(),
          new Date(+now - 2 * hour).toISOString(),
          new Date(+now - 7 * 24 * hour).toISOString(),
        );
      if (!row) return null;
      db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?").run(
        now.toISOString(),
        hash,
      );
      return { userId: row.user_id, role: row.role };
    })
    .immediate();
}

/** Replace the current session without leaving both credentials live. */
export function replaceSession(
  previous: string | null,
  hash: string,
  userId: string,
  now: Date,
  expiry: Date,
): void {
  const db = getDb();
  const at = now.toISOString();
  db.transaction(() => {
    if (previous)
      db.prepare("DELETE FROM sessions WHERE id_hash = ?").run(previous);
    db.prepare(
      "INSERT INTO sessions(id_hash,user_id,created_at,last_seen_at,expires_at) VALUES (?,?,?,?,?)",
    ).run(hash, userId, at, at, expiry.toISOString());
  }).immediate();
}

/** Revoke one presented session. */
export function deleteSession(hash: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id_hash = ?").run(hash);
}
