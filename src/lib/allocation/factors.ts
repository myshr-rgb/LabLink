import { DAY_MS } from "@/lib/booking/slots";
import type { Candidate, Factors } from "./types";
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const priority = { normal: 0, high: 0.5, critical: 1 };
/** Normalize request evidence into five comparable factors. */
export function factors(
  candidate: Candidate,
  weeklyQuotaHours: number,
  now: Date,
): Factors {
  const usage = Math.max(0, candidate.hoursUsed14d);
  return {
    deadline: candidate.deadline
      ? 1 - clamp((Date.parse(candidate.deadline) - +now) / (14 * DAY_MS))
      : 0,
    priority: priority[candidate.priority],
    fairShare:
      weeklyQuotaHours > 0
        ? 1 - clamp(usage / (2 * weeklyQuotaHours))
        : Number(usage === 0),
    waiting: clamp((+now - Date.parse(candidate.createdAt)) / (3 * DAY_MS)),
    reliability: clamp(1 - 0.25 * candidate.noShows60d),
  };
}
