"use client";
import { useState, type FormEvent } from "react";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import type { Actor } from "@/types/domain";
import { authenticate } from "./auth-request";

export function AuthForm({
  mode,
  onSuccess,
}: {
  mode: "login" | "signup";
  onSuccess: (actor: Actor) => void | Promise<void>;
}): React.JSX.Element {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const signup = mode === "signup";
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (fields.departmentCode === "") delete fields.departmentCode;
    const result = (signup ? signupSchema : loginSchema).safeParse(fields);
    if (!result.success) {
      setMessage(result.error.issues[0].message);
      const field = result.error.issues[0].path[0];
      const control = event.currentTarget.elements.namedItem(String(field));
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onSuccess(await authenticate(mode, result.data));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3" aria-busy={busy}>
      {signup && (
        <label>
          Name
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            className="block w-full rounded border border-border-strong p-2"
          />
        </label>
      )}
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="block w-full rounded border border-border-strong p-2"
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={signup ? "new-password" : "current-password"}
          required
          minLength={signup ? 10 : undefined}
          maxLength={signup ? 72 : 256}
          className="block w-full rounded border border-border-strong p-2"
        />
      </label>
      <button
        type="button"
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
        className="justify-self-start text-accent"
      >
        Show password
      </button>
      {signup && (
        <>
          <p className="text-sm text-text-muted">
            Use at least 10 characters and avoid common passwords.
          </p>
          <label>
            Department (optional)
            <select
              name="departmentCode"
              className="block w-full rounded border border-border-strong p-2"
            >
              <option value="">Choose a department</option>
              <option value="CSE">Computer Science</option>
              <option value="ECE">Electronics and Communication</option>
              <option value="EEE">Electrical and Electronics</option>
              <option value="MECH">Mechanical</option>
              <option value="BIO">Biotech</option>
            </select>
          </label>
        </>
      )}
      {message && (
        <p role="alert" className="text-danger">
          {message}
        </p>
      )}
      <button
        data-testid={signup ? "signup-submit" : "login-submit"}
        disabled={busy}
        className="min-h-11 rounded bg-accent px-4 text-bg disabled:opacity-60"
      >
        {busy ? "Please wait" : signup ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
