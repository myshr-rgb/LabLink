import { expect, it, vi } from "vitest";
import { z } from "zod";
import { apiHandler } from "@/lib/security/api-handler";
import { RateLimiter } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/types/domain";

const context = { params: Promise.resolve({}) };
const now = new Date("2026-01-01T00:00:00Z");
function setup() {
  const deps = {
    limiter: new RateLimiter(),
    now: () => now,
    loadSession: vi.fn<() => Actor | null>(() => ({
      userId: "u",
      role: "faculty",
    })),
  };
  const handler = vi.fn(({ body }: { body: { title: string } }) => body.title);
  const route = apiHandler(
    {
      auth: { roles: ["faculty"] },
      bucket: { name: "test", limit: 5, windowMs: 1500 },
      body: { title: z.string() },
      handler,
    },
    deps,
  );
  function send(
    body = '{"title":"ok"}',
    origin = "http://localhost:3000",
    type = "application/json",
    url = "http://localhost:3000/api/test",
  ) {
    return route(
      new Request(url, {
        method: "POST",
        body,
        headers: { origin, "content-type": type },
      }),
      context,
    );
  }
  return { send, deps, handler };
}
it("SEC-06/09/11 applies rate, origin, session, role and validation gates in order", async () => {
  const { send, deps, handler } = setup();
  expect((await send("bad", "https://invalid.example")).status).toBe(403);
  expect(deps.loadSession).not.toHaveBeenCalled();
  deps.loadSession.mockReturnValueOnce(null);
  expect((await send("bad")).status).toBe(401);
  deps.loadSession.mockReturnValueOnce({ userId: "s", role: "student" });
  expect((await send("bad")).status).toBe(403);
  const invalid = await send('{"title":"ok","extra":1}');
  expect(await invalid.json()).toEqual({
    error: {
      code: "VALIDATION_ERROR",
      message: "Check the submitted fields.",
      details: { body: "Invalid value." },
      requestId: invalid.headers.get("x-request-id"),
    },
  });
  expect(invalid.status).toBe(422);
  expect(handler).not.toHaveBeenCalled();
  expect(await (await send()).json()).toEqual({ data: "ok" });
  const limited = await send("bad", "null");
  expect(limited.status).toBe(429);
  expect(limited.headers.get("Retry-After")).toBe("2");
  expect(await limited.json()).toMatchObject({
    error: {
      code: "RATE_LIMITED",
      requestId: limited.headers.get("x-request-id"),
    },
  });
  expect(deps.loadSession).toHaveBeenCalledTimes(4);
});
it("SEC-06 rejects malformed JSON, unsupported type and unknown query or route fields", async () => {
  const { send } = setup();
  expect((await send("bad")).status).toBe(400);
  const { deps } = setup();
  const route = apiHandler(
    {
      auth: "public",
      bucket: { name: "params", limit: 5, windowMs: 1000 },
      handler: () => true,
    },
    deps,
  );
  const invalidParams = await route(new Request("http://localhost:3000"), {
    params: Promise.resolve({ extra: "field" }),
  });
  expect(invalidParams.status).toBe(422);
  expect((await send("{}", "http://localhost:3000", "text/plain")).status).toBe(
    400,
  );
  expect(
    (
      await send(
        "{}",
        "http://localhost:3000",
        "application/json",
        "http://localhost:3000/api/test?extra=1",
      )
    ).status,
  ).toBe(422);
});
it("SEC-13 maps known errors and hides internal diagnostics", async () => {
  const { send, handler } = setup();
  handler.mockImplementationOnce(() => {
    throw new AppError("NOT_FOUND", "Resource unavailable.");
  });
  expect((await send()).status).toBe(404);
  handler.mockImplementationOnce(() => {
    throw new Error("private diagnostic");
  });
  const response = await send();
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      code: "INTERNAL",
      message: "Something went wrong.",
      requestId: response.headers.get("x-request-id"),
    },
  });
});
it("SEC-11 expires individual hits at the sliding window boundary", () => {
  const limiter = new RateLimiter();
  const bucket = { name: "test", limit: 2, windowMs: 1000 };
  limiter.check(bucket, "a", 0);
  limiter.check(bucket, "a", 500);
  expect(() => limiter.check(bucket, "a", 999)).toThrow();
  limiter.check(bucket, "b", 999);
  limiter.check(bucket, "a", 1000);
  expect(() => limiter.check(bucket, "a", 1001)).toThrow();
});
