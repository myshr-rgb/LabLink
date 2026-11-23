import { apiHandler } from "@/lib/security/api-handler";
import { conflicts } from "@/services/conflict.service";
export const GET = apiHandler({
  auth: { roles: ["incharge", "admin"] },
  bucket: { name: "conflict-list", limit: 120, windowMs: 60_000 },
  handler: ({ actor }) => conflicts(actor),
});
