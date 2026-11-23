import type { Role } from "@/types/domain";

export const DEMO_ROLES = ["student", "faculty", "incharge", "admin"] as const;
/** Stable identity for each of the four seeded demo accounts. */
export function demoUserId(role: Role): string {
  return (
    "00000000-0000-4000-8000-" +
    String(2000 + DEMO_ROLES.indexOf(role)).padStart(12, "0")
  );
}
