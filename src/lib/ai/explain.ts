import { generateJson } from "./client";
import { prompt } from "./prompts";
import { explainedSchema } from "./schemas";
interface Explanation {
  id: string;
  reason: string;
}
const numbers = (text: string): string =>
  [...(text.match(/\d+(?:\.\d+)?/g) ?? [])].sort().join("|");
/** Rephrase anonymous deterministic evidence and retain the original on failure. */
export async function phraseReasons(
  rows: Explanation[],
): Promise<{ result: Explanation[]; source: "ai" | "rules" }> {
  const input = rows.slice(0, 20);
  const fallback = { result: input, source: "rules" as const };
  if (!input.length) return fallback;
  const originals = new Map(input.map((row) => [row.id, row.reason]));
  const phrases = await generateJson(
    "explain",
    prompt("explain", { items: input }),
    explainedSchema,
  );
  if (
    !phrases ||
    phrases.items.length !== input.length ||
    new Set(phrases.items.map((row) => row.id)).size !== input.length
  )
    return fallback;
  if (
    !phrases.items.every(
      (row) =>
        originals.has(row.id) &&
        numbers(row.reason) === numbers(originals.get(row.id)!),
    )
  )
    return fallback;
  return { result: phrases.items, source: "ai" };
}
