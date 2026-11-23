import { z } from "zod";
import { allowedPassword } from "@/lib/auth/password-policy";
import { DEMO_ROLES } from "@/lib/auth/demo-identity";

export const loginShape = {
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email())
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(256),
};
export const signupShape = {
  ...loginShape,
  name: z.string().trim().min(1).max(80),
  password: z
    .string()
    .max(72)
    .refine(
      allowedPassword,
      "Use 10 or more characters, up to 72 UTF-8 bytes, and avoid common passwords.",
    ),
  departmentCode: z.enum(["CSE", "ECE", "EEE", "MECH", "BIO"]).optional(),
};
export const demoShape = { role: z.enum(DEMO_ROLES) };
export const loginSchema = z.strictObject(loginShape);
export const signupSchema = z.strictObject(signupShape);
