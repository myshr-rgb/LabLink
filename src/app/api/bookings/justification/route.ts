import { apiHandler } from "@/lib/security/api-handler";
import { aiDraftShape } from "@/lib/validation/ai-inputs";
import { suggestJustification } from "@/services/ai.service";

export const POST = apiHandler({
  auth: { roles: ["student"] },
  bucket: { name: "ai-draft-ip", limit: 120, windowMs: 600_000 },
  sessionBucket: { name: "ai-draft", guest: 20, user: 60, windowMs: 600_000 },
  body: aiDraftShape,
  handler: ({ actor, body, now }) =>
    suggestJustification(actor, body.projectId, body.equipmentId, now),
});
