import type { Window } from "@/lib/booking/slots";
import type { Priority } from "@/types/workflow";

export const FACTOR_KEYS = [
  "deadline",
  "priority",
  "fairShare",
  "waiting",
  "reliability",
] as const;
export type Factor = (typeof FACTOR_KEYS)[number];
export type Factors = Record<Factor, number>;
export interface Policy {
  weights: Factors;
  weeklyQuotaHours: number;
}
export interface Candidate extends Window {
  id: string;
  createdAt: string;
  deadline: string | null;
  priority: Priority;
  hoursUsed14d: number;
  noShows60d: number;
}
export interface Alternative extends Window {
  equipmentId: string;
  equipmentName: string;
  lab: string;
  kind: "same-equipment" | "equivalent" | "shorter";
}
export interface Decision {
  bookingId: string;
  rank: number;
  score: number;
  factors: Factors;
  outcome: "approved" | "displaced";
  reasonText: string;
  alternatives: Alternative[];
}
export const DEFAULT_POLICY: Policy = {
  weights: {
    deadline: 0.3,
    priority: 0.25,
    fairShare: 0.25,
    waiting: 0.1,
    reliability: 0.1,
  },
  weeklyQuotaHours: 8,
};
