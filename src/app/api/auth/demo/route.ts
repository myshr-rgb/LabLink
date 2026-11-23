import { getConfig } from "@/lib/config";
import { apiHandler } from "@/lib/security/api-handler";
import { demoShape } from "@/lib/validation/auth";
import { loginDemo } from "@/services/auth.service";

export const POST = apiHandler({
  enabled: () => getConfig().DEMO_MODE,
  auth: "public",
  bucket: { name: "demo", limit: 20, windowMs: 60_000 },
  body: demoShape,
  handler({ body, request, responseHeaders, now }) {
    const { actor, cookie } = loginDemo(
      body.role,
      request.headers.get("cookie"),
      now,
    );
    responseHeaders.set("Set-Cookie", cookie);
    return actor;
  },
});
