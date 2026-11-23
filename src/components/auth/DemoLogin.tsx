"use client";
import { useState } from "react";
import type { Actor, Role } from "@/types/domain";
import { authenticate } from "./auth-request";

const options = {
  student: "Student",
  faculty: "Faculty",
  incharge: "In-charge",
  admin: "Admin",
} as const;

export function DemoLogin({
  onSuccess,
}: {
  onSuccess: (actor: Actor) => void | Promise<void>;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function enter(role: Role): Promise<void> {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await onSuccess(await authenticate("demo", { role }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset
      disabled={busy}
      className="grid grid-cols-2 gap-2 rounded border border-border p-3"
    >
      <legend className="px-2">Try a demo account</legend>
      {Object.entries(options).map(([role, label]) => (
        <button
          key={role}
          onClick={() => void enter(role as Role)}
          type="button"
          className="min-h-11 rounded border border-border-strong px-2"
        >
          {label}
        </button>
      ))}
      {message && (
        <p role="alert" className="col-span-2 text-danger">
          {message}
        </p>
      )}
    </fieldset>
  );
}
