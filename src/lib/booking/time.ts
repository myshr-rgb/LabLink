export const CAMPUS_UTC_OFFSET_MIN = 330;
export const SLOT_MINUTES = 30;
const MINUTE_MS = 60_000;
const SLOT_MS = SLOT_MINUTES * MINUTE_MS;

/** Return the campus calendar date of a UTC instant, including at midnight. */
export function campusDate(now: Date): string {
  return new Date(+now + CAMPUS_UTC_OFFSET_MIN * MINUTE_MS)
    .toISOString()
    .slice(0, 10);
}
/** Check alignment down to the millisecond. */
export function isSlotBoundary(at: Date): boolean {
  return at.getTime() % SLOT_MS === 0;
}
/** First bookable boundary at or after the supplied instant. */
export function ceilToSlot(now: Date): Date {
  return new Date(Math.ceil(+now / SLOT_MS) * SLOT_MS);
}
