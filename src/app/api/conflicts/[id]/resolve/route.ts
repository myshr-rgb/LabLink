import { apiHandler } from "@/lib/security/api-handler";
import { resolutionShape } from "@/lib/validation/conflict";
import { idShape } from "@/lib/validation/equipment";
import { resolveConflict } from "@/services/conflict.service";

export const POST = apiHandler({
  auth: { roles: ["incharge", "admin"] },
  bucket: { name: "conflict-resolve", limit: 30, windowMs: 60_000 },
  params: idShape,
  body: resolutionShape,
  handler: ({ actor, params, body, now }) =>
    resolveConflict(actor, params.id, body, now),
});
