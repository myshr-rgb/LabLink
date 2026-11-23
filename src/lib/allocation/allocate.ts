import type { Window } from "@/lib/booking/slots";
import { factors } from "./factors";
import { score } from "./score";
import { explainTemplate } from "./explain-template";
import type { Alternative, Candidate, Decision, Policy } from "./types";

/** Check UTC half-open ranges from canonical stored timestamps. */
export function intersect(a: Window, b: Window): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}
/** Rank requests and pick a greedy non-overlapping set around confirmed blockers. */
export function allocate(
  candidates: readonly Candidate[],
  policy: Policy,
  now: Date,
  blocked: readonly Window[] = [],
  suggest: (
    candidate: Candidate,
    winners: readonly Window[],
  ) => Alternative[] = () => [],
): Decision[] {
  const sorted = candidates
    .map((candidate) => {
      const values = factors(candidate, policy.weeklyQuotaHours, now);
      return { candidate, values, score: score(values, policy.weights) };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.createdAt.localeCompare(b.candidate.createdAt) ||
        a.candidate.id.localeCompare(b.candidate.id),
    );
  const winners: Window[] = [];
  const outcomes = sorted.map(({ candidate, values, score: total }, index) => {
    const available = ![...blocked, ...winners].some((window) =>
      intersect(candidate, window),
    );
    if (available) winners.push(candidate);
    return {
      bookingId: candidate.id,
      rank: index + 1,
      score: total,
      factors: values,
      outcome: available ? "approved" : "displaced",
      reasonText: explainTemplate(
        index + 1,
        candidate,
        values,
        policy.weights,
        now,
      ),
    } satisfies Omit<Decision, "alternatives">;
  });
  return outcomes.map((decision, index) => ({
    ...decision,
    alternatives:
      decision.outcome === "displaced"
        ? suggest(sorted[index].candidate, winners)
        : [],
  }));
}
