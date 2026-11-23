import { apiHandler } from "@/lib/security/api-handler";
import { loginShape } from "@/lib/validation/auth";
import { login, LOGIN_WINDOW } from "@/services/auth.service";

export const POST = apiHandler({
  auth: "public",
  bucket: { name: "login", ...LOGIN_WINDOW },
  body: loginShape,
  async handler({ body, request, responseHeaders, now }) {
    const { actor, cookie } = await login(
      body,
      request.headers.get("cookie"),
      now,
    );
    responseHeaders.set("Set-Cookie", cookie);
    return actor;
  },
});
