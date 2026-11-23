import manifest from "../../../../package.json";
import { apiHandler } from "@/lib/security/api-handler";

export const GET = apiHandler({
  auth: "public",
  bucket: { name: "health", limit: 120, windowMs: 60_000 },
  handler: () => ({ status: "ok", version: manifest.version }),
});
