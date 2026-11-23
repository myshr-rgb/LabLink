import Link from "next/link";
import type { ReactNode } from "react";

export const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 font-medium text-bg hover:bg-accent-hover disabled:opacity-50";
export const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-bg px-4 py-2 font-medium hover:bg-surface disabled:opacity-50";
export const control =
  "block min-h-11 w-full rounded-lg border border-border-strong bg-bg px-3 py-2";
export const card = "rounded-xl border border-border bg-bg p-4 shadow-sm";
export const page = "mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6";

export function EmptyState({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href?: string;
  label?: string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p>{children}</p>
      {href && (
        <Link
          href={href}
          className="mt-2 inline-flex min-h-11 items-center font-medium text-accent underline"
        >
          {label}
        </Link>
      )}
    </div>
  );
}
