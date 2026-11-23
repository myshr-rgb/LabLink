import { TtlCache } from "@/lib/utils/cache";
import type { Equipment } from "@/types/equipment";
export interface Catalogue {
  items: Equipment[];
  total: number;
  page: number;
  pageSize: number;
}
const shared = globalThis as typeof globalThis & {
  lablinkCatalogueCache?: TtlCache<Catalogue>;
};
export const catalogueCache = (shared.lablinkCatalogueCache ??=
  new TtlCache<Catalogue>(128, 30_000));
/** Clear catalogue results after any change that may alter date availability. */
export function invalidateCatalogue(): void {
  catalogueCache.clear();
}
