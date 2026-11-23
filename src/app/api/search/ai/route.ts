import { apiHandler } from "@/lib/security/api-handler";
import { aiSearchShape } from "@/lib/validation/ai-inputs";
import { searchWithAi } from "@/services/ai.service";

export const POST = apiHandler({
  auth: "public",
  bucket: { name: "ai-search-ip", limit: 120, windowMs: 600_000 },
  sessionBucket: { name: "ai-search", guest: 20, user: 60, windowMs: 600_000 },
  body: aiSearchShape,
  handler: ({ body, now }) => searchWithAi(body.query, now),
});
