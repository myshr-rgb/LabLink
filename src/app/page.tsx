import Link from "next/link";
import { SearchBox } from "@/components/equipment/SearchBox";
import { card, page } from "@/components/ui/workflow-ui";

const topics = [
  ["FPGA boards", "FPGA"],
  ["3D printers", "3D printer"],
  ["Oscilloscopes", "oscilloscope"],
  ["GPU workstations", "GPU workstation"],
];
export default function Home(): React.JSX.Element {
  return (
    <main id="content" className={page + " space-y-12"}>
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-12">
        <div className="max-w-3xl space-y-5">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Find the lab equipment you need
          </h1>
          <p className="text-lg text-text-muted">
            Search by equipment name, category, or the tools you need for your
            project.
          </p>
          <SearchBox />
          <div className="flex flex-wrap gap-2">
            {topics.map(([label, q]) => (
              <Link
                key={q}
                className="inline-flex min-h-11 items-center rounded-full border border-border-strong bg-bg px-3 text-accent"
                href={`/equipment?q=${encodeURIComponent(q)}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section aria-labelledby="how-heading" className="space-y-4">
        <h2 id="how-heading" className="text-2xl font-semibold">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Find equipment",
            "Pick a slot",
            "Get approval if required",
            "Use the lab",
          ].map((step) => (
            <li key={step} className={card}>
              {step}
            </li>
          ))}
        </ol>
        <Link
          href="/how-it-works"
          className="inline-flex min-h-11 items-center font-medium text-accent underline"
        >
          Read about booking and approvals
        </Link>
      </section>
    </main>
  );
}
