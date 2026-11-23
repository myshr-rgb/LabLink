import { z } from "zod";
const instant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());
const description = (max: number) => z.string().trim().min(1).max(max);
export const windowShape = { startAt: instant, endAt: instant };
export const bookingShape = {
  ...windowShape,
  equipmentId: z.uuid(),
  projectId: z.uuid().optional(),
  justification: z.string().trim().max(1000).default(""),
};
export const bookingUpdate = {
  ...windowShape,
  projectId: z.uuid().optional(),
  justification: z.string().trim().max(1000).default(""),
};
export const decisionShape = {
  decision: z.enum(["approve", "reject", "changes"]),
  comment: z.string().trim().max(1000).default(""),
};
export const projectShape = {
  title: description(100),
  description: description(2000),
  guideId: z.uuid(),
  deadline: instant,
  memberIds: z.array(z.uuid()).max(20).default([]),
  equipmentIds: z.array(z.uuid()).max(20).default([]),
};
export const projectUpdate = {
  title: projectShape.title.optional(),
  description: projectShape.description.optional(),
  guideId: projectShape.guideId.optional(),
  deadline: instant.optional(),
  memberIds: z.array(z.uuid()).max(20).optional(),
  equipmentIds: z.array(z.uuid()).max(20).optional(),
  priority: z.enum(["normal", "high", "critical"]).optional(),
};
export const projectSchema = z.strictObject(projectShape);
export const projectUpdateSchema = z.strictObject(projectUpdate);
export const bookingSchema = z.strictObject(bookingShape);
export const bookingUpdateSchema = z.strictObject(bookingUpdate);
export const decisionSchema = z.strictObject(decisionShape);
export type BookingInput = z.output<typeof bookingSchema>;
export type BookingUpdate = z.output<typeof bookingUpdateSchema>;
export type ProjectInput = z.output<typeof projectSchema>;
export type ProjectUpdate = z.output<typeof projectUpdateSchema>;
export type Decision = z.output<typeof decisionSchema>;
