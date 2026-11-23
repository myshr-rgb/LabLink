import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { decisionShape } from "@/lib/validation/workflow";
import { decide } from "@/services/approval.service";
export const POST = apiHandler({
  auth: { roles: ["faculty", "admin"] },
  bucket: { name: "approval-decision", limit: 120, windowMs: 60000 },
  params: idShape,
  body: decisionShape,
  handler: ({ actor, params, body, now }) =>
    decide(actor, params.id, body, now),
});
