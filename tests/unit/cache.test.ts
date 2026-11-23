import { expect, it } from "vitest";
import { TtlCache } from "@/lib/utils/cache";

it("F-11 evicts least recently used values and expires them on the 30 second boundary", () => {
  const cache = new TtlCache<number>(2, 30_000);
  cache.set("first", 1, 0);
  cache.set("second", 2, 10);
  expect(cache.get("first", 20)).toBe(1);
  cache.set("third", 3, 30);
  expect(cache.get("second", 30)).toBeUndefined();
  expect(cache.get("first", 29_999)).toBe(1);
  expect(cache.get("first", 30_000)).toBeUndefined();
  cache.clear();
  expect(cache.get("third", 30_000)).toBeUndefined();
});
