/** Keep fixture references stable across clean database runs. */
export function fixtureId(group: number, index: number): string {
  return `00000000-0000-4000-8000-${String(group * 1000 + index).padStart(12, "0")}`;
}
