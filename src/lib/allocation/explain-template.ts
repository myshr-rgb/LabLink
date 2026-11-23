import { DAY_MS } from "@/lib/booking/slots";
import { FACTOR_KEYS, type Candidate, type Factors } from "./types";

function hours(value: number): string {
  return String(Math.round(value * 10) / 10);
}
/** Cite the two largest weighted contributions using the original evidence. */
export function explainTemplate(
  rank: number,
  candidate: Candidate,
  values: Factors,
  weights: Factors,
  now: Date,
): string {
  const remaining = candidate.deadline
    ? Math.max(0, Math.ceil((Date.parse(candidate.deadline) - +now) / DAY_MS))
    : null;
  const facts = {
    deadline:
      remaining === null
        ? "no project deadline on file"
        : `project deadline in ${remaining} days`,
    priority: `${candidate.priority} faculty priority`,
    fairShare: `${hours(candidate.hoursUsed14d)} h of lab time used in the last 14 days`,
    waiting: `${hours(Math.max(0, +now - Date.parse(candidate.createdAt)) / 3_600_000)} h waiting`,
    reliability: `${candidate.noShows60d} no-shows in the last 60 days`,
  };
  const [first, second] = [...FACTOR_KEYS].sort(
    (a, b) => values[b] * weights[b] - values[a] * weights[a],
  );
  return `Ranked #${rank}: ${facts[first]} and ${facts[second]}.`;
}
