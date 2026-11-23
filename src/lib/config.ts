import { randomBytes } from "node:crypto";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["test", "development", "production"])
      .default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_PATH: z.string().min(1).default("./data/lablink.db"),
    SESSION_SECRET: z.string().min(32).optional(),
    DEMO_MODE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    GEMINI_API_KEY: z.string().default(""),
    GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .strict();

/** Validate only application-owned environment keys; never include their values in errors. */
export function readConfig(
  env: NodeJS.ProcessEnv,
): z.output<typeof schema> & { SESSION_SECRET: string } {
  const parsed = schema.safeParse(
    Object.fromEntries(Object.keys(schema.shape).map((key) => [key, env[key]])),
  );
  if (!parsed.success)
    throw new Error("Invalid LabLink environment configuration.");
  const settings = parsed.data;
  if (!settings.SESSION_SECRET && settings.NODE_ENV === "production")
    throw new Error("SESSION_SECRET is required in production.");
  return {
    ...settings,
    SESSION_SECRET: settings.SESSION_SECRET ?? randomBytes(32).toString("hex"),
  };
}

let settings: ReturnType<typeof readConfig> | undefined;
/** Validate at runtime, when deployment secrets are available. */
export function getConfig(): ReturnType<typeof readConfig> {
  return (settings ??= readConfig(process.env));
}
