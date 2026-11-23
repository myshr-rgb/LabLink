import { createHash } from "node:crypto";
import { refreshSession } from "@/lib/db/repositories/session.repo";
import type { Actor } from "@/types/domain";

/** Only the digest of an opaque session cookie reaches storage. */
export function loadSession(request: Request, now: Date): Actor | null {
  const token = /(?:^|;\s*)lablink_sid=([A-Za-z0-9_-]{43})(?:;|$)/.exec(
    request.headers.get("cookie") ?? "",
  )?.[1];
  return token
    ? refreshSession(createHash("sha256").update(token).digest("hex"), now)
    : null;
}
