import {
  availability,
  campusInstant,
  DAY_MS,
  slotsForDay,
} from "@/lib/booking/slots";
import { campusDate } from "@/lib/booking/time";
import { blockingWindows } from "@/lib/db/repositories/availability.repo";
import {
  findEquipment,
  findEquipmentList,
} from "@/lib/db/repositories/equipment.repo";
import { AppError } from "@/lib/errors";
import type { EquipmentQuery } from "@/lib/validation/equipment";
import type { Equipment } from "@/types/equipment";
import { sweepExpired } from "./booking-state";
import { catalogueCache, type Catalogue } from "./catalogue-cache";
import { keyword } from "./search.service";

const byName = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
/** Public catalogue search with AND filters and stable pagination. */
export function catalogue(query: EquipmentQuery, now: Date): Catalogue {
  if (query.date) sweepExpired(now);
  const key = JSON.stringify(query);
  const saved = catalogueCache.get(key, +now);
  if (saved) return saved;
  const inventory = findEquipmentList(query);
  const date = query.date;
  const matches = date ? availableOn(inventory, date, now) : inventory;
  const sorted = keyword(matches, query.q).sort((a, b) => {
    const alphabetical =
      byName.compare(a.item.name, b.item.name) ||
      a.item.id.localeCompare(b.item.id);
    return query.sort === "name-desc"
      ? -alphabetical
      : query.sort === "name"
        ? alphabetical
        : b.score - a.score || alphabetical;
  });
  const offset = (query.page - 1) * query.pageSize;
  const result = {
    items: sorted
      .slice(offset, offset + query.pageSize)
      .map((match) => match.item),
    total: sorted.length,
    page: query.page,
    pageSize: query.pageSize,
  };
  catalogueCache.set(key, result, +now);
  return result;
}
function availableOn(items: Equipment[], date: string, now: Date): Equipment[] {
  const start = campusInstant(date);
  const blocks = blockingWindows({
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + DAY_MS).toISOString(),
  });
  return items.filter(
    (item) =>
      item.status === "available" &&
      slotsForDay(date, item, now, blocks.get(item.id)).some(
        (slot) => slot.state === "free",
      ),
  );
}
/** Return filter facets across visible inventory. */
export function equipmentFacets(): {
  categories: string[];
  departments: { code: string; name: string }[];
} {
  const items = findEquipmentList({});
  return {
    categories: [...new Set(items.map((item) => item.category))].sort(),
    departments: [
      ...new Map(
        items.map((item) => [
          item.departmentCode,
          { code: item.departmentCode, name: item.department },
        ]),
      ).values(),
    ].sort((a, b) => byName.compare(a.name, b.name)),
  };
}
/** Read a public equipment item or return 404 for retired or missing items. */
export function equipmentDetail(id: string): Equipment {
  const item = findEquipment(id);
  if (!item) throw new AppError("NOT_FOUND", "Equipment is unavailable.");
  return item;
}
/** Return only slot states and times to guests. */
export function equipmentAvailability(
  id: string,
  now: Date,
  except?: string,
): ReturnType<typeof availability> {
  sweepExpired(now);
  const item = equipmentDetail(id);
  const startAt = new Date(campusInstant(campusDate(now))).toISOString();
  const endAt = new Date(Date.parse(startAt) + 14 * DAY_MS).toISOString();
  const blocks = blockingWindows({ startAt, endAt }, id, except).get(id) ?? [];
  if (item.status === "maintenance")
    blocks.push({ startAt, endAt, state: "maintenance" });
  return availability(item, now, blocks);
}

/** Project the inventory record onto the fields guests can read. */
export function publicEquipment(
  item: Equipment,
): Omit<Equipment, "inChargeId" | "departmentId"> {
  const fields: Partial<Equipment> = { ...item };
  delete fields.inChargeId;
  delete fields.departmentId;
  return fields as Omit<Equipment, "inChargeId" | "departmentId">;
}
