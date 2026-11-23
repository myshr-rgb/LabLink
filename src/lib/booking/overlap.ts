interface Interval {
  start: Date;
  end: Date;
}
/** Empty or reversed intervals occupy no time. Endpoints are exclusive. */
export function overlaps(a: Interval, b: Interval): boolean {
  return (
    a.start < a.end && b.start < b.end && a.start < b.end && b.start < a.end
  );
}
