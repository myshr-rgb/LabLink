import { validateSession } from "./session";
import type { Actor } from "@/types/domain";

/** Adapt the request pipeline to the session lifecycle. */
export function loadSession(request: Request, now: Date): Actor | null {
  return validateSession(request.headers.get("cookie"), now);
}
