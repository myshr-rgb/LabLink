import { z } from "zod";
import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { windowShape } from "@/lib/validation/workflow";
import { scheduleMaintenance } from "@/services/maintenance.service";
export const POST = apiHandler({
  auth: { roles: ["incharge", "admin"] },
  bucket: { name: "maintenance", limit: 20, windowMs: 60_000 },
  params: idShape,
  body: { ...windowShape, reason: z.string().trim().min(1).max(500) },
  handler: ({ actor, params, body, now }) =>
    scheduleMaintenance(actor, params.id, body, body.reason, now),
});
