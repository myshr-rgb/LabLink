import {
  CAMPUS_UTC_OFFSET_MIN,
  SLOT_MINUTES,
  campusDate,
  ceilToSlot,
} from "./time";

export const DAY_MS = 86_400_000;
export const SLOT_MS = SLOT_MINUTES * 60_000;
export interface Schedule {
  openTime: string;
  closeTime: string;
  weekdays: readonly number[];
  advanceDays: number;
}
export interface Window {
  startAt: string;
  endAt: string;
}
export interface Block extends Window {
  state: "booked" | "maintenance";
}
export interface Slot extends Window {
  state: "free" | Block["state"];
}
export interface DaySlots {
  date: string;
  slots: Slot[];
}

/** Interpret a calendar day and time as campus wall time. */
export function campusInstant(day: string, time = "00:00"): number {
  return Date.parse(`${day}T${time}:00Z`) - CAMPUS_UTC_OFFSET_MIN * 60_000;
}

/** Enumerate only whole slots inside opening hours and the advance window. */
export function slotsForDay(
  date: string,
  schedule: Schedule,
  now: Date,
  blocks: readonly Block[] = [],
): Slot[] {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (!schedule.weekdays.includes(weekday)) return [];
  const start = Math.max(
    +ceilToSlot(new Date(campusInstant(date, schedule.openTime))),
    +ceilToSlot(now),
  );
  const end = Math.min(
    campusInstant(date, schedule.closeTime),
    +now + schedule.advanceDays * DAY_MS,
  );
  const slots: Slot[] = [];
  for (let t = start; t + SLOT_MS <= end; t += SLOT_MS) {
    const startAt = new Date(t).toISOString();
    const endAt = new Date(t + SLOT_MS).toISOString();
    const hits = blocks.filter(
      (block) => block.startAt < endAt && block.endAt > startAt,
    );
    slots.push({
      startAt,
      endAt,
      state: hits.some((block) => block.state === "maintenance")
        ? "maintenance"
        : hits.length
          ? "booked"
          : "free",
    });
  }
  return slots;
}

/** Return 14 campus calendar days including today. */
export function availability(
  schedule: Schedule,
  now: Date,
  blocks: readonly Block[],
): DaySlots[] {
  return Array.from({ length: 14 }, (_, index) => {
    const date = campusDate(new Date(+now + index * DAY_MS));
    return { date, slots: slotsForDay(date, schedule, now, blocks) };
  });
}
