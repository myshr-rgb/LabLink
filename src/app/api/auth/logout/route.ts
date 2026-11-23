import { apiHandler } from "@/lib/security/api-handler";
import { logout } from "@/services/auth.service";

export const POST = apiHandler({
  auth: "public",
  bucket: { name: "logout", limit: 30, windowMs: 60_000 },
  handler({ actor, request, now, responseHeaders }) {
    responseHeaders.set(
      "Set-Cookie",
      logout(actor, request.headers.get("cookie"), now),
    );
    return null;
  },
});
