"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "./AuthForm";
import { DemoLogin } from "./DemoLogin";

export function AuthPageForm({
  mode,
  demoMode,
}: {
  mode: "login" | "signup";
  demoMode?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  function finish(): void {
    router.replace("/");
    router.refresh();
  }
  return (
    <main className="mx-auto grid max-w-md gap-5 p-6">
      <h1 className="text-3xl font-semibold">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <AuthForm mode={mode} onSuccess={finish} />
      <Link
        className="text-accent underline"
        href={mode === "login" ? "/signup" : "/login"}
      >
        {mode === "login"
          ? "Create an account"
          : "Already have an account? Sign in"}
      </Link>
      {demoMode && <DemoLogin onSuccess={finish} />}
    </main>
  );
}
