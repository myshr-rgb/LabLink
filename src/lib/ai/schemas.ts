import { z } from "zod";
const plain = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((text) => !/[<>]/.test(text));
export const rankedSchema = z.strictObject({
  items: z
    .array(z.strictObject({ id: z.string().max(80), reason: plain(140) }))
    .max(10),
});
export const explainedSchema = z.strictObject({
  items: z
    .array(z.strictObject({ id: z.string().max(80), reason: plain(280) }))
    .max(20),
});
export const draftedSchema = z.strictObject({ text: plain(600) });
