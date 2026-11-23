import { page } from "@/components/ui/workflow-ui";
export default function Loading(): React.JSX.Element {
  return (
    <main id="content" aria-busy="true" className={page}>
      <p role="status">Loading LabLink…</p>
      <div aria-hidden="true" className="mt-4 h-24 rounded-xl bg-surface" />
    </main>
  );
}
