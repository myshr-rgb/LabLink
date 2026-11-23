"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Actor } from "@/types/domain";

export function UserMenu({
  actor,
}: {
  actor: Actor | null;
}): React.JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function signOut(): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Sign out failed.");
      router.refresh();
    } catch {
      setMessage("Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!actor)
    return (
      <nav aria-label="Account" className="flex gap-4">
        <Link href="/login">Sign in</Link>
        <Link href="/signup">Create account</Link>
      </nav>
    );
  return (
    <details className="text-right">
      <summary className="cursor-pointer capitalize" data-testid="user-menu">
        {actor.role === "incharge" ? "In-charge" : actor.role}
      </summary>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        className="min-h-11 text-accent"
      >
        Sign out
      </button>
      {message && (
        <p role="alert" className="text-danger">
          {message}
        </p>
      )}
    </details>
  );
}
