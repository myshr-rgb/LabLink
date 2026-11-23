import {
  DAY_MS,
  SLOT_MS,
  slotsForDay,
  type Block,
  type Schedule,
  type Window,
} from "@/lib/booking/slots";
import { campusDate } from "@/lib/booking/time";
import { intersect } from "./allocate";
import type { Alternative, Candidate } from "./types";

export interface Resource extends Schedule {
  id: string;
  name: string;
  lab: string;
  category: string;
  tags: readonly string[];
  maxBookingMinutes: number;
  blocks: readonly Block[];
}
/** Compare equipment by shared distinct tags. */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const left = new Set(a),
    right = new Set(b);
  const union = new Set([...left, ...right]).size;
  return union ? [...left].filter((tag) => right.has(tag)).length / union : 0;
}
function option(
  item: Resource,
  window: Window,
  kind: Alternative["kind"],
): Alternative {
  return {
    ...window,
    equipmentId: item.id,
    equipmentName: item.name,
    lab: item.lab,
    kind,
  };
}
function validRange(item: Resource, window: Window, now: Date): boolean {
  const slots = slotsForDay(
    campusDate(new Date(window.startAt)),
    item,
    now,
    item.blocks,
  ).filter(
    (slot) => slot.startAt >= window.startAt && slot.endAt <= window.endAt,
  );
  return (
    slots[0]?.startAt === window.startAt &&
    slots.at(-1)?.endAt === window.endAt &&
    slots.every((slot) => slot.state === "free") &&
    Date.parse(window.endAt) - Date.parse(window.startAt) <=
      item.maxBookingMinutes * 60_000
  );
}
function sameItem(
  original: Resource,
  request: Candidate,
  now: Date,
  limit: number,
): Alternative[] {
  const start = Date.parse(request.startAt),
    end = Date.parse(request.endAt);
  const length = (end - start) / SLOT_MS;
  const results: Alternative[] = [];
  const availableFrom = Math.max(+now, start);
  if (availableFrom >= limit) return results;
  for (let date = 0; date <= 7; date++) {
    const slots = slotsForDay(
      campusDate(new Date(availableFrom + date * DAY_MS)),
      original,
      now,
      original.blocks,
    );
    for (let index = 0; index < slots.length; index++) {
      const first = slots[index];
      if (Date.parse(first.startAt) < start) continue;
      const span = slots.slice(index, index + length);
      const last = span.at(-1);
      if (
        last &&
        span.length === length &&
        length * SLOT_MS <= original.maxBookingMinutes * 60_000 &&
        Date.parse(last.endAt) <= limit &&
        span.every((slot) => slot.state === "free")
      )
        results.push(
          option(
            original,
            { startAt: first.startAt, endAt: last.endAt },
            "same-equipment",
          ),
        );
      if (results.length >= 3) return results;
    }
  }
  return results;
}
/** Offer compatible windows in start-time distance order, with stable ties. */
export function findAlternatives(
  request: Candidate,
  original: Resource,
  equivalents: readonly Resource[],
  winners: readonly Window[],
  now: Date,
): Alternative[] {
  const start = Date.parse(request.startAt),
    end = Date.parse(request.endAt);
  const limit = Math.min(
    start + 7 * DAY_MS,
    request.deadline ? Date.parse(request.deadline) : Infinity,
  );
  const held = original.blocks.concat(
    winners.map((window) => ({ ...window, state: "booked" as const })),
  );
  const resource = { ...original, blocks: held };
  const options = sameItem(resource, request, now, limit);
  if (end <= limit) {
    for (const other of equivalents) {
      if (
        other.id !== original.id &&
        other.category === original.category &&
        jaccard(other.tags, original.tags) >= 0.4 &&
        validRange(other, request, now)
      )
        options.push(
          option(
            other,
            { startAt: request.startAt, endAt: request.endAt },
            "equivalent",
          ),
        );
    }
  }
  const partial = slotsForDay(
    campusDate(new Date(start)),
    resource,
    now,
    held,
  ).filter(
    (slot) =>
      slot.state === "free" &&
      intersect(slot, request) &&
      Date.parse(slot.endAt) <= Math.min(end, limit),
  );
  if (partial.length && end - start > SLOT_MS) {
    const [first] = partial;
    let last = first;
    for (const next of partial.slice(1)) {
      if (
        next.startAt !== last.endAt ||
        Date.parse(next.endAt) - Date.parse(first.startAt) >
          resource.maxBookingMinutes * 60_000
      )
        break;
      last = next;
    }
    options.push(
      option(
        original,
        { startAt: first.startAt, endAt: last.endAt },
        "shorter",
      ),
    );
  }
  const order = { equivalent: 1, "same-equipment": 0, shorter: 2 };
  return options
    .sort(
      (a, b) =>
        Math.abs(Date.parse(a.startAt) - start) -
          Math.abs(Date.parse(b.startAt) - start) ||
        order[a.kind] - order[b.kind] ||
        a.equipmentId.localeCompare(b.equipmentId),
    )
    .slice(0, 3);
}
