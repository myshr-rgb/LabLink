import { generateJson } from "./client";
import { prompt, promptText } from "./prompts";
import { draftedSchema } from "./schemas";

/** Suggest editable plain text without submitting or changing a booking. */
export async function draftJustification(
  equipment: string,
  work: string,
): Promise<{ result: string; source: "ai" | "rules" }> {
  const fallback =
    `I would like to use ${equipment} to test and document the work for my project. During the session, I will set up the equipment, run the planned tests, and record the results.`.slice(
      0,
      600,
    );
  const draft = await generateJson(
    "draft",
    prompt("draft", { equipment, work: promptText(work, 2000) }),
    draftedSchema,
  );
  return draft
    ? { result: draft.text, source: "ai" }
    : { result: fallback, source: "rules" };
}
