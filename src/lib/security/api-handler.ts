import { isIP } from "node:net";
import { z } from "zod";
import { loadSession } from "@/lib/auth/load-session";
import { getConfig } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logger";
import type { Actor, Role } from "@/types/domain";
import { checkOrigin } from "./origin";
import { RateLimiter, RateLimitError, type Bucket } from "./rate-limit";
import { requestId } from "./request-id";

type Shape = z.ZodRawShape;
type Values<S extends Shape> = z.output<z.ZodObject<S>>;
interface Options<P extends Shape, Q extends Shape, B extends Shape, T> {
  auth: "public" | "user" | { roles: readonly Role[] };
  bucket: Bucket;
  params?: P;
  query?: Q;
  body?: B;
  handler(input: {
    params: Values<P>;
    query: Values<Q>;
    body: Values<B>;
    actor: Actor | null;
    requestId: string;
  }): T | Promise<T>;
}
const limiter = new RateLimiter();

function authorize(
  auth: Options<Shape, Shape, Shape, unknown>["auth"],
  actor: Actor | null,
): void {
  if (auth === "public") return;
  if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
  if (typeof auth === "object" && !auth.roles.includes(actor.role))
    throw new AppError("FORBIDDEN", "Permission denied.");
}
function parse<S extends Shape>(
  shape: S | undefined,
  value: unknown,
  location: string,
): Values<S> {
  const result = z
    .object(shape ?? ({} as S))
    .strict()
    .safeParse(value);
  if (result.success) return result.data;
  const details = Object.fromEntries(
    result.error.issues.map((issue) => [
      [location, ...issue.path].join("."),
      "Invalid value.",
    ]),
  );
  throw new AppError(
    "VALIDATION_ERROR",
    "Check the submitted fields.",
    details,
  );
}
function queryValues(request: Request): Record<string, string | string[]> {
  const fields = new Map<string, string | string[]>();
  for (const [key, value] of new URL(request.url).searchParams) {
    const previous = fields.get(key);
    if (Array.isArray(previous)) previous.push(value);
    else fields.set(key, previous === undefined ? value : [previous, value]);
  }
  return Object.fromEntries(fields);
}

async function readBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return {};
  try {
    return await request.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Malformed JSON.");
  }
}
function failure(cause: unknown, id: string): Response {
  const error =
    cause instanceof AppError
      ? cause
      : new AppError("INTERNAL", "Something went wrong.");
  if (!error.expose) log("error", "error", { requestId: id, status: 500 });
  const headers = new Headers({ "x-request-id": id });
  if (error instanceof RateLimitError)
    headers.set("Retry-After", String(error.retryAfter));
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.expose ? error.message : "Something went wrong.",
        details: error.expose ? error.details : undefined,
        requestId: id,
      },
    },
    { status: error.status, headers },
  );
}

/** Validate before handing trusted input and the authenticated actor to services. */
export function apiHandler<
  P extends Shape = Record<string, never>,
  Q extends Shape = Record<string, never>,
  B extends Shape = Record<string, never>,
  T = unknown,
>(
  options: Options<P, Q, B, T>,
  deps = { limiter, loadSession, now: () => new Date() },
): (
  request: Request,
  context: { params: Promise<Record<string, string | string[]>> },
) => Promise<Response> {
  return async (request, context) => {
    const id = requestId(request.headers);
    try {
      const now = deps.now();
      // Cloud Run appends the peer address; only trust its suffix on that platform.
      const ip = process.env.K_SERVICE
        ? request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
        : undefined;
      deps.limiter.check(options.bucket, ip && isIP(ip) ? ip : "local", +now);
      checkOrigin(request, getConfig().APP_URL);
      const actor = deps.loadSession(request, now);
      authorize(options.auth, actor);
      const params = parse(options.params, (await context.params) ?? {}, "params");
      const query = parse(options.query, queryValues(request), "query");
      const body = parse(options.body, await readBody(request), "body");
      const data = await options.handler({
        params,
        query,
        body,
        actor,
        requestId: id,
      });
      return Response.json({ data }, { headers: { "x-request-id": id } });
    } catch (cause) {
      return failure(cause, id);
    }
  };
}
