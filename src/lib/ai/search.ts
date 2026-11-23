import { generateJson } from "./client";
import { prompt, promptText } from "./prompts";
import { rankedSchema } from "./schemas";
export interface SearchCandidate {
  id: string;
  name: string;
  category: string;
  tags: string[];
  reason: string;
}
/** Ask the model to reorder a bounded shortlist. Invalid IDs invalidate the entire response. */
export async function aiSearch(
  query: string,
  items: readonly SearchCandidate[],
): Promise<{
  result: { id: string; reason: string }[];
  source: "ai" | "rules";
}> {
  const candidates = items.slice(0, 20);
  const fallback = {
    result: candidates.slice(0, 10).map(({ id, reason }) => ({ id, reason })),
    source: "rules" as const,
  };
  if (!candidates.length) return fallback;
  const rank = await generateJson(
    "search",
    prompt("search", {
      query: promptText(query, 500),
      items: candidates.map(({ id, name, category, tags }) => ({
        id,
        name,
        category,
        tags,
      })),
    }),
    rankedSchema,
  );
  const ids = new Set(candidates.map((item) => item.id));
  if (
    !rank?.items.length ||
    new Set(rank.items.map((item) => item.id)).size !== rank.items.length ||
    !rank.items.every((item) => ids.has(item.id))
  )
    return fallback;
  return { result: rank.items, source: "ai" };
}
