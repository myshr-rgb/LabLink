const campusOptions = { timeZone: "Asia/Kolkata" } as const;
const clock = new Intl.DateTimeFormat("en-GB", {
  ...campusOptions,
  hour: "2-digit",
  minute: "2-digit",
});
const date = new Intl.DateTimeFormat("en-IN", {
  ...campusOptions,
  weekday: "short",
  day: "numeric",
  month: "short",
});
/** Format one instant in campus time. */
export function campusTime(value: string): string {
  return clock.format(new Date(value));
}
/** Format a day with weekday for campus schedules. */
export function dayLabel(value: string): string {
  return date.format(
    new Date(value.length === 10 ? value + "T00:00:00Z" : value),
  );
}
/** Format a UTC interval as readable campus time. */
export function windowLabel(start: string, end: string): string {
  return `${dayLabel(start)}, ${campusTime(start)}–${campusTime(end)} IST`;
}
/** Convert a campus datetime-local value to portable UTC. */
export function fromCampusInput(value: string): string {
  const instant = Date.parse(value + "+05:30");
  return Number.isFinite(instant) ? new Date(instant).toISOString() : "";
}
/** Convert UTC to the fixed campus offset for datetime-local controls. */
export function toCampusInput(value: string): string {
  return new Date(Date.parse(value) + 330 * 60_000).toISOString().slice(0, 16);
}
