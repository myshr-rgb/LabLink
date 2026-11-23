import { z } from "zod";
import { ACCESS_TYPES } from "@/types/equipment";

// Browser GET forms send an empty string for optional filters.
function optionalFilter<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );
}

const filterText = z
  .string()
  .trim()
  .regex(/^[^\p{Cc}]*$/u, "Use printable text.");
const integerParam = z.union([z.number(), z.string().regex(/^\d+$/)]);

export const idShape = { id: z.uuid() };
export const equipmentQuery = {
  q: filterText.max(120).default(""),
  department: optionalFilter(filterText.min(1).max(20)),
  category: optionalFilter(filterText.min(1).max(50)),
  accessType: optionalFilter(z.enum(ACCESS_TYPES)),
  date: optionalFilter(z.iso.date()),
  sort: z.enum(["match", "name", "name-desc"]).default("match"),
  page: integerParam
    .pipe(z.coerce.number<string | number>().int().min(1).max(10000))
    .default(1),
  pageSize: integerParam
    .pipe(z.coerce.number<string | number>().int().min(1).max(48))
    .default(12),
};
export const equipmentSearch = z.strictObject(equipmentQuery);
export type EquipmentQuery = z.output<typeof equipmentSearch>;
