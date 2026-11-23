import { AppError } from "@/lib/errors";
import type { Actor, Role } from "@/types/domain";
import { demoUserId } from "./demo-identity";

/** Require an authenticated actor in one of the permitted roles. */
export function requireRole(
  actor: Actor | null,
  roles?: readonly Role[],
): Actor {
  if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
  if (roles && !roles.includes(actor.role))
    throw new AppError("FORBIDDEN", "Permission denied.");
  return actor;
}

/** Prevent ownership checks from exposing the existence of another user's record. */
export function assertOwner(actor: Actor, ownerId: string): void {
  if (actor.userId !== ownerId)
    throw new AppError("NOT_FOUND", "Resource unavailable.");
}

/** Require a full administrator before changing accounts or credentials. */
export function requireAccountAdmin(actor: Actor | null): Actor {
  const admin = requireRole(actor, ["admin"]);
  if (admin.userId === demoUserId("admin"))
    throw new AppError(
      "FORBIDDEN",
      "Demo administrators have read-only account access.",
    );
  return admin;
}
