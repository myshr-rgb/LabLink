import { z } from "zod";
export const resolutionShape = {
  action: z.enum(["accept", "override"]),
  winnerIds: z.array(z.uuid()).max(100).optional(),
  reason: z.string().trim().max(500).optional(),
  revision: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
};
export const resolutionSchema = z.strictObject(resolutionShape);
export type Resolution = z.output<typeof resolutionSchema>;
