import { createHash, randomBytes } from "node:crypto";
import { getConfig } from "@/lib/config";
import {
  refreshSession,
  replaceSession,
  deleteSession,
} from "@/lib/db/repositories/session.repo";
import type { Actor } from "@/types/domain";
import { DEMO_ROLES, demoUserId } from "./demo-identity";

const SESSION_SECONDS = 7 * 24 * 60 * 60;
const COOKIE = "lablink_sid";
function digest(cookie: string | null): string | null {
  const token = /(?:^|;\s*)lablink_sid=([A-Za-z0-9_-]{43})(?:;|$)/.exec(
    cookie ?? "",
  )?.[1];
  return token ? hashToken(token) : null;
}
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
function cookie(token: string, maxAge: number): string {
  const secure = getConfig().NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** Resolve and refresh a live session using only its digest in storage. */
export function validateSession(
  header: string | null,
  now: Date,
): Actor | null {
  const hash = digest(header);
  if (!hash) return null;
  const actor = refreshSession(hash, now);
  if (
    actor &&
    !getConfig().DEMO_MODE &&
    DEMO_ROLES.some((role) => demoUserId(role) === actor.userId)
  )
    return null;
  return actor;
}

/** Issue a fresh session, atomically invalidating the presented session if one exists. */
export function rotateSession(
  userId: string,
  header: string | null,
  now: Date,
): string {
  const token = randomBytes(32).toString("base64url");
  replaceSession(
    digest(header),
    hashToken(token),
    userId,
    now,
    new Date(+now + SESSION_SECONDS * 1000),
  );
  return cookie(token, SESSION_SECONDS);
}

/** Create a session for a caller without a prior cookie. */
export function createSession(userId: string, now: Date): string {
  return rotateSession(userId, null, now);
}

/** Revoke the presented session and clear the cookie. */
export function destroySession(header: string | null): string {
  const hash = digest(header);
  if (hash) deleteSession(hash);
  return cookie("", 0);
}
