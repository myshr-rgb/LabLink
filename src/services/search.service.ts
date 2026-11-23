import type { Equipment } from "@/types/equipment";

/** Match every token across inventory metadata and rank name/tag matches highest. */
export function keyword(
  items: readonly Equipment[],
  query: string,
): { item: Equipment; score: number }[] {
  const tokens = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
  return items.flatMap((item) => {
    const title = item.name.toLowerCase();
    const tags = item.tags.join(" ").toLowerCase();
    const text = [
      title,
      tags,
      item.category,
      item.lab,
      item.department,
      ...Object.values(item.specs),
    ]
      .join(" ")
      .toLowerCase();
    if (!tokens.every((token) => text.includes(token))) return [];
    const score = tokens.reduce(
      (sum, token) =>
        sum + (title.includes(token) ? 4 : tags.includes(token) ? 2 : 1),
      0,
    );
    return [{ item, score }];
  });
}
