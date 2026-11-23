import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { explainConflict } from "@/services/ai.service";

export const POST = apiHandler({
  auth: { roles: ["incharge", "admin"] },
  bucket: { name: "ai-explain-ip", limit: 120, windowMs: 600_000 },
  sessionBucket: { name: "ai-explain", guest: 20, user: 60, windowMs: 600_000 },
  params: idShape,
  handler: ({ actor, params, now }) => explainConflict(actor, params.id, now),
});
