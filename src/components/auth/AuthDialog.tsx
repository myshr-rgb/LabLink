"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Actor } from "@/types/domain";
import { AuthForm } from "./AuthForm";
import { DemoLogin } from "./DemoLogin";

interface Props<Draft> {
  open: boolean;
  context: string;
  draft: Draft;
  onClose: () => void;
  onResume: (draft: Draft, actor: Actor) => void | Promise<void>;
  demoMode?: boolean;
}

/** Keep the caller's draft in place and resume it with the new session. */
export function AuthDialog<Draft>({
  open,
  context,
  draft,
  onClose,
  onResume,
  demoMode,
}: Props<Draft>): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  async function resume(actor: Actor): Promise<void> {
    router.refresh();
    await onResume(draft, actor);
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="w-full max-w-md rounded bg-bg p-6 text-text backdrop:bg-text/40"
    >
      {open && (
        <div className="grid gap-4">
          <h2 id={title} className="text-2xl font-semibold">
            Sign in to continue
          </h2>
          <p>{context}</p>
          <AuthForm key={mode} mode={mode} onSuccess={resume} />
          <button
            type="button"
            className="min-h-11 text-accent"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create an account" : "Use an existing account"}
          </button>
          {demoMode && <DemoLogin onSuccess={resume} />}
          <button type="button" className="min-h-11" onClick={onClose}>
            Cancel
          </button>
        </div>
      )}
    </dialog>
  );
}
