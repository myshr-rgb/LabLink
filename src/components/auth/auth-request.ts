import type { Actor } from "@/types/domain";

/** Authenticate through same-origin routes; the browser handles the session cookie. */
export async function authenticate(
  endpoint: "login" | "signup" | "demo",
  body: object,
): Promise<Actor> {
  const response = await fetch(`/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as
    { data: Actor } | { error: { message: string } };
  if ("error" in result) throw new Error(result.error.message);
  return result.data;
}
