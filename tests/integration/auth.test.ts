import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as demo } from "@/app/api/auth/demo/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { createSession, validateSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { login as loginService } from "@/services/auth.service";

vi.stubEnv("DATABASE_PATH", ":memory:");
vi.stubEnv("DEMO_MODE", "false");
vi.stubEnv("APP_URL", "http://localhost:3000");
const origin = "http://localhost:3000";
const context = { params: Promise.resolve({}) };
const details = {
  name: "Test Student",
  email: "tester@example.edu",
  password: "spring bench 6112",
};
function write(
  route: typeof signup,
  body: object,
  cookie = "",
): Promise<Response> {
  return route(
    new Request(origin, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    }),
    context,
  );
}

it("SEC-01/02/04/11/17/19 enforces auth policy, rotates sessions and audits", async () => {
  expect((await write(demo, { role: "admin" })).status).toBe(404);
  expect((await write(signup, { ...details, role: "admin" })).status).toBe(422);
  const created = await write(signup, details);
  expect(created.status).toBe(200);
  const { data: actor } = await created.json();
  expect(actor.role).toBe("student");
  const cookie = created.headers.get("set-cookie")!.split(";")[0];
  expect(created.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Lax");
  const db = getDb();
  expect(
    db
      .prepare("SELECT password_hash FROM users WHERE id=?")
      .pluck()
      .get(actor.userId),
  ).toMatch(/^\$2[aby]\$12\$/);
  expect(db.prepare("SELECT id_hash FROM sessions").pluck().get()).toBe(
    createHash("sha256").update(cookie.split("=")[1]).digest("hex"),
  );

  const payload = { email: details.email, password: "wrong password" };
  const misses = await Promise.all([
    write(login, payload),
    write(login, { ...payload, email: "unknown@example.edu" }),
  ]);
  for (const response of misses) {
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: {
        code: "UNAUTHENTICATED",
        message: "Email or password is incorrect.",
      },
    });
  }
  const signedIn = await write(
    login,
    { email: details.email.toUpperCase(), password: details.password },
    cookie,
  );
  expect(signedIn.status).toBe(200);
  const fresh = signedIn.headers.get("set-cookie")!.split(";")[0];
  expect(fresh).not.toBe(cookie);
  const who = async (value: string) =>
    (
      await me(new Request(origin, { headers: { cookie: value } }), context)
    ).json();
  expect(await who(cookie)).toEqual({ data: null });
  expect(await who(fresh)).toEqual({ data: actor });
  const signedOut = await write(logout, {}, fresh);
  expect(signedOut.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(await who(fresh)).toEqual({ data: null });
  await write(login, payload);
  await write(login, payload);
  const limited = await write(login, payload);
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(db.prepare("SELECT action FROM audit_log").pluck().all()).toEqual(
    expect.arrayContaining([
      "auth.signup",
      "auth.login",
      "auth.login_failed",
      "auth.logout",
    ]),
  );
  const at = new Date("2026-01-01T00:00:00Z");
  const idle = createSession(actor.userId, at).split(";")[0];
  expect(validateSession(idle, new Date(+at + 2 * 3_600_000))).toBeNull();
  const absolute = createSession(actor.userId, at).split(";")[0];
  db.prepare("UPDATE sessions SET last_seen_at=? WHERE id_hash=?").run(
    new Date(+at + 7 * 86400000 - 1).toISOString(),
    createHash("sha256").update(absolute.split("=")[1]).digest("hex"),
  );
  expect(validateSession(absolute, new Date(+at + 7 * 86400000))).toBeNull();
}, 15_000);

it("SEC-11 locks normalized account keys independently of the IP bucket", async () => {
  const now = new Date("2026-02-01T00:00:00Z");
  const input = { email: "locked@example.edu", password: "wrong password" };
  for (let i = 0; i < 5; i++)
    await expect(loginService(input, null, now)).rejects.toMatchObject({
      status: 401,
    });
  await expect(loginService(input, null, now)).rejects.toMatchObject({
    status: 429,
    retryAfter: 900,
  });
  await expect(
    loginService(input, null, new Date(+now + 900_000)),
  ).rejects.toMatchObject({ status: 401 });
}, 10_000);
