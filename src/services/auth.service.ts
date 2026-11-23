import { createHash } from "node:crypto";
import type { z } from "zod";
import { demoUserId } from "@/lib/auth/demo-identity";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroySession, rotateSession } from "@/lib/auth/session";
import { getConfig } from "@/lib/config";
import {
  auditAuth,
  authTransaction,
  findAccount,
  findDemoAccount,
  insertStudent,
} from "@/lib/db/repositories/auth.repo";
import { AppError } from "@/lib/errors";
import { RateLimiter, RateLimitError } from "@/lib/security/rate-limit";
import type { loginSchema, signupSchema } from "@/lib/validation/auth";
import type { Actor, Role } from "@/types/domain";

type SessionResult = { actor: Actor; cookie: string };
const attempts = new RateLimiter();
export const LOGIN_WINDOW = { limit: 5, windowMs: 15 * 60_000 };

function signIn(
  actor: Actor,
  previous: string | null,
  now: Date,
  action: string,
): SessionResult {
  return authTransaction(() => {
    const cookie = rotateSession(actor.userId, previous, now);
    auditAuth(action, actor, now);
    return { actor, cookie };
  });
}

/** Assign the student role inside the account transaction. */
export async function signup(
  input: z.output<typeof signupSchema>,
  previous: string | null,
  now: Date,
): Promise<SessionResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    return authTransaction(() => {
      const actor = insertStudent(
        {
          name: input.name,
          email: input.email,
          passwordHash,
          departmentCode: input.departmentCode,
        },
        now,
      );
      return signIn(actor, previous, now, "auth.signup");
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "SQLITE_CONSTRAINT_UNIQUE"
    )
      throw error;
    auditAuth("auth.signup_failed", null, now);
    throw new AppError(
      "VALIDATION_ERROR",
      "Unable to create an account with those details.",
    );
  }
}

/** Apply a normalized account lockout in addition to the request IP limit. */
export async function login(
  input: z.output<typeof loginSchema>,
  previous: string | null,
  now: Date,
): Promise<SessionResult> {
  const email = input.email.trim().toLowerCase();
  const key = createHash("sha256").update(email).digest("hex");
  try {
    attempts.check({ name: "login-account", ...LOGIN_WINDOW }, key, +now);
  } catch (error) {
    if (error instanceof RateLimitError)
      auditAuth("auth.login_limited", null, now);
    throw error;
  }
  const account = findAccount(email);
  if (
    !(await verifyPassword(input.password, account?.passwordHash)) ||
    !account
  ) {
    auditAuth("auth.login_failed", null, now);
    throw new AppError("UNAUTHENTICATED", "Email or password is incorrect.");
  }
  return signIn(
    { userId: account.userId, role: account.role },
    previous,
    now,
    "auth.login",
  );
}

/** Exchange a valid demo role for an ordinary, revocable session. */
export function loginDemo(
  role: Role,
  previous: string | null,
  now: Date,
): SessionResult {
  if (!getConfig().DEMO_MODE)
    throw new AppError("NOT_FOUND", "Resource unavailable.");
  const account = findDemoAccount(demoUserId(role), role);
  if (!account) {
    auditAuth("auth.demo_failed", null, now);
    throw new AppError("NOT_FOUND", "Resource unavailable.");
  }
  return signIn(
    { userId: account.userId, role: account.role },
    previous,
    now,
    "auth.demo_login",
  );
}

/** Clear the browser cookie and audit revocation in the same transaction. */
export function logout(
  actor: Actor | null,
  previous: string | null,
  now: Date,
): string {
  return authTransaction(() => {
    const cookie = destroySession(previous);
    auditAuth("auth.logout", actor, now);
    return cookie;
  });
}
