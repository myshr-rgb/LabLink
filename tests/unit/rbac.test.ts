import { expect, it } from "vitest";
import {
  assertOwner,
  requireAccountAdmin,
  requireRole,
} from "@/lib/auth/guards";
import { DEMO_ROLES, demoUserId } from "@/lib/auth/demo-identity";
import { allowedPassword } from "@/lib/auth/password-policy";

it.each(DEMO_ROLES)("SEC-05 admits %s only to allowed role gates", (role) => {
  const actor = { userId: "owner", role };
  expect(requireRole(actor, [role])).toBe(actor);
  for (const other of DEMO_ROLES.filter((candidate) => candidate !== role))
    expect(() => requireRole(actor, [other])).toThrow("Permission denied");
  expect(() => assertOwner(actor, "other")).toThrow("Resource unavailable");
  expect(() => assertOwner(actor, "owner")).not.toThrow();
});
it("SEC-05/17 rejects guests and demo admin account writes", () => {
  expect(() => requireRole(null)).toThrow("Sign in");
  expect(() =>
    requireAccountAdmin({ userId: demoUserId("admin"), role: "admin" }),
  ).toThrow("read-only");
  expect(
    requireAccountAdmin({ userId: "real-admin", role: "admin" }).role,
  ).toBe("admin");
});
it("SEC-01 rejects common, short and bcrypt-truncated passwords", () => {
  expect(allowedPassword("Password123")).toBe(false);
  expect(allowedPassword("short")).toBe(false);
  expect(allowedPassword("🔒".repeat(19))).toBe(false);
  expect(allowedPassword("A new lab passphrase")).toBe(true);
});
