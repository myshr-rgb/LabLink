import { NextRequest, NextResponse } from "next/server";
import { securityHeaders } from "@/lib/security/headers";

export function middleware(request: NextRequest): NextResponse {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  );
  const id = crypto.randomUUID();
  const security = securityHeaders(
    nonce,
    process.env.NODE_ENV === "production",
  );
  const incoming = new Headers(request.headers);
  incoming.set(
    "Content-Security-Policy",
    security.get("Content-Security-Policy")!,
  );
  incoming.set("x-request-id", id);
  incoming.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: incoming } });
  security.forEach((value, key) => response.headers.set(key, value));
  response.headers.set("x-request-id", id);
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
