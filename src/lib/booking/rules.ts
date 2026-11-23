import { campusDate, isSlotBoundary } from "./time";
import {
  campusInstant,
  DAY_MS,
  SLOT_MS,
  type Schedule,
  type Window,
} from "./slots";

/** Return a field-safe validation message for a rejected booking window. */
export function windowProblem(
  window: Window,
  schedule: Schedule & { maxBookingMinutes: number },
  now: Date,
): string | undefined {
  const start = new Date(window.startAt);
  const end = new Date(window.endAt);
  const duration = +end - +start;
  if (
    !isSlotBoundary(start) ||
    !isSlotBoundary(end) ||
    duration < SLOT_MS ||
    duration > schedule.maxBookingMinutes * 60_000
  )
    return "Choose a duration within the equipment limit in 30-minute increments.";
  if (+start < +now || +end > +now + schedule.advanceDays * DAY_MS)
    return "Choose a future time within the advance booking window.";
  const day = campusDate(start);
  if (
    !schedule.weekdays.includes(new Date(`${day}T00:00:00Z`).getUTCDay()) ||
    +start < campusInstant(day, schedule.openTime) ||
    +end > campusInstant(day, schedule.closeTime)
  )
    return "Choose a time within campus opening hours.";
}
