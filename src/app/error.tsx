"use client";
import { button, page } from "@/components/ui/workflow-ui";
export default function ErrorPage({
  reset,
}: {
  reset: () => void;
}): React.JSX.Element {
  return (
    <main id="content" className={page}>
      <h1 className="text-2xl font-semibold">Could not load this page</h1>
      <p role="alert" className="my-4">
        Try loading it again.
      </p>
      <button className={button} onClick={reset}>
        Retry
      </button>
    </main>
  );
}
