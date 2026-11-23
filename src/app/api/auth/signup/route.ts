import { apiHandler } from "@/lib/security/api-handler";
import { signupShape } from "@/lib/validation/auth";
import { signup } from "@/services/auth.service";

export const POST = apiHandler({
  auth: "public",
  bucket: { name: "signup", limit: 10, windowMs: 60 * 60_000 },
  body: signupShape,
  async handler({ body, request, responseHeaders, now }) {
    const { actor, cookie } = await signup(
      body,
      request.headers.get("cookie"),
      now,
    );
    responseHeaders.set("Set-Cookie", cookie);
    return actor;
  },
});
