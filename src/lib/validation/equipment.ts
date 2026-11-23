import { z } from "zod";
import { ACCESS_TYPES } from "@/types/equipment";

// Browser GET forms send an empty string for optional filters.
function optionalFilter<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );
}

export const idShape = { id: z.uuid() };
export const equipmentQuery = {
  q: z.string().trim().max(120).default(""),
  department: optionalFilter(z.string().trim().min(1).max(20)),
  category: optionalFilter(z.string().trim().min(1).max(50)),
  accessType: optionalFilter(z.enum(ACCESS_TYPES)),
  date: optionalFilter(z.iso.date()),
  sort: z.enum(["match", "name", "name-desc"]).default("match"),
  page: z.coerce.number<string>().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number<string>().int().min(1).max(48).default(12),
};
export const equipmentSearch = z.strictObject(equipmentQuery);
export type EquipmentQuery = z.output<typeof equipmentSearch>;
