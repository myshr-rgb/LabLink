import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth/session";
import type { Actor } from "@/types/domain";

/** Resolve the actor for server-rendered pages without a loopback API request. */
export async function viewer(): Promise<Actor | null> {
  return validateSession((await headers()).get("cookie"), new Date());
}
/** Redirect unauthenticated visitors from private pages. */
export async function signedInViewer(): Promise<Actor> {
  const actor = await viewer();
  if (!actor) redirect("/login");
  return actor;
}
