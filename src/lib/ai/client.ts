import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { getConfig } from "@/lib/config";
import { log } from "@/lib/logger";

/** Convert an optional model response to strictly validated data within the caller budget. */
export async function generateJson<T>(
  feature: "search" | "explain" | "draft",
  prompt: { system: string; contents: string },
  schema: z.ZodType<T>,
): Promise<T | null> {
  const config = getConfig();
  if (!config.GEMINI_API_KEY) return null;
  const started = performance.now();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let outcome = "fallback";
  try {
    const client = new GoogleGenAI({
      apiKey: config.GEMINI_API_KEY,
      httpOptions: { retryOptions: { attempts: 1 } },
    });
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => {
          controller.abort();
          reject(new Error("AI timeout"));
        },
        Math.min(8000, config.AI_TIMEOUT_MS),
      );
    });
    const response = await Promise.race([
      client.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: prompt.contents,
        config: {
          systemInstruction: prompt.system,
          responseMimeType: "application/json",
          abortSignal: controller.signal,
          maxOutputTokens: 4096,
        },
      }),
      timeout,
    ]);
    const result = schema.safeParse(JSON.parse(response.text ?? ""));
    if (!result.success) return null;
    outcome = "success";
    return result.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    log("info", "ai", {
      feature,
      outcome,
      source: outcome === "success" ? "ai" : "rules",
      durationMs: Math.round(performance.now() - started),
    });
  }
}
