import { AppError } from "@/lib/errors";

/** Require the configured origin and host before processing writes. */
export function checkOrigin(request: Request, appUrl: string): void {
  if (request.method === "GET" || request.method === "HEAD") return;
  const app = new URL(appUrl);
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (
    request.headers.get("origin") !== app.origin ||
    host.toLowerCase() !== app.host
  )
    throw new AppError("FORBIDDEN", "Request origin is not allowed.");
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AppError("BAD_REQUEST", "Use application/json for this request.");
}
