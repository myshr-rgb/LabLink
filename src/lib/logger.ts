import { config } from "@/lib/config";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

/** Emit only operational fields; never serialize caller payloads or credentials. */
export function log(
  level: Level,
  event: "startup" | "request" | "error",
  context: { status?: number; durationMs?: number } = {},
): void {
  if (LEVELS[level] < LEVELS[config.LOG_LEVEL]) return;
  const { status, durationMs } = context;
  process.stdout.write(
    JSON.stringify({
      time: new Date().toISOString(),
      level,
      event,
      status,
      durationMs,
    }) + "\n",
  );
}
