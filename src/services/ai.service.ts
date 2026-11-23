import { aiSearch } from "@/lib/ai/search";
import { draftJustification } from "@/lib/ai/draft";
import { phraseReasons } from "@/lib/ai/explain";
import { requireRole } from "@/lib/auth/guards";
import { findEquipmentList } from "@/lib/db/repositories/equipment.repo";
import { saveReason } from "@/lib/db/repositories/allocation.repo";
import { writeTransaction } from "@/lib/db/repositories/transaction";
import { TtlCache } from "@/lib/utils/cache";
import type { Actor } from "@/types/domain";
import { reviewConflict, authorizedConflict } from "./conflict.service";
import { equipmentDetail, publicEquipment } from "./equipment.service";
import { requestProject } from "./project.service";
import { keyword } from "./search.service";

type SearchResult = {
  items: { id: string; name: string; lab: string; reason: string }[];
  source: "ai" | "rules";
};
const cache = new TtlCache<SearchResult>(128, 5 * 60_000);
const stop = new Set([
  "a",
  "an",
  "and",
  "to",
  "for",
  "with",
  "i",
  "need",
  "want",
  "the",
  "my",
  "use",
  "something",
  "that",
  "can",
]);
/** Retrieve public keyword candidates then optionally re-rank them with Gemini. */
export async function searchWithAi(
  query: string,
  now: Date,
): Promise<SearchResult> {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  const hit = cache.get(normalized, +now);
  if (hit) return hit;
  const tokens = [...new Set(normalized.match(/[a-z0-9-]{2,}/g) ?? [])]
    .filter((word) => !stop.has(word))
    .slice(0, 20);
  const inventory = findEquipmentList({}).filter(
    (item) => item.status === "available",
  );
  const matched = new Map<string, number>();
  for (const token of tokens)
    for (const { item, score } of keyword(inventory, token))
      matched.set(item.id, (matched.get(item.id) ?? 0) + score);
  const candidates = inventory
    .filter((item) => matched.has(item.id))
    .sort(
      (a, b) =>
        matched.get(b.id)! - matched.get(a.id)! || a.id.localeCompare(b.id),
    )
    .slice(0, 20);
  const map = new Map(candidates.map((item) => [item.id, item]));
  const { result, source } = await aiSearch(
    query,
    candidates.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      tags: item.tags,
      reason: `Matches terms in the ${item.category} inventory.`,
    })),
  );
  const value = {
    source,
    items: result.map((row) => ({
      ...row,
      name: map.get(row.id)!.name,
      lab: map.get(row.id)!.lab,
    })),
  };
  cache.set(normalized, value, +now);
  return value;
}
/** Draft text using the student's own project and visible equipment. */
export async function suggestJustification(
  actor: Actor | null,
  projectId: string,
  itemId: string,
  now: Date,
) {
  const user = requireRole(actor, ["student"]);
  const project = requestProject(user, projectId);
  const item = publicEquipment(equipmentDetail(itemId));
  const key = `${project.id}:${item.id}:${project.description}`;
  const found = drafts.get(key, +now);
  if (found) return found;
  const result = await draftJustification(item.name, project.description);
  drafts.set(key, result, +now);
  return result;
}
const drafts = new TtlCache<Awaited<ReturnType<typeof draftJustification>>>(
  128,
  5 * 60_000,
);

/** Optionally store reviewed phrasing while keeping the engine's reason intact. */
export async function explainConflict(
  actor: Actor | null,
  id: string,
  now: Date,
): Promise<{ source: "ai" | "rules" }> {
  const review = reviewConflict(actor, id, now);
  if (review.group.status !== "open") return { source: "rules" };
  const pending = review.ranked.filter((row) => !row.aiReasonText).slice(0, 20);
  if (!pending.length)
    return {
      source: review.ranked.some((row) => row.aiReasonText) ? "ai" : "rules",
    };
  const { result, source } = await phraseReasons(
    pending.map((row, index) => ({
      id: String(index + 1),
      reason: row.reasonText,
    })),
  );
  if (source === "rules") return { source };
  const applied = writeTransaction(() => {
    if (authorizedConflict(actor, id).status !== "open") return false;
    return result
      .map((row) => saveReason(id, pending[Number(row.id) - 1], row.reason))
      .some(Boolean);
  });
  return { source: applied ? "ai" : "rules" };
}
