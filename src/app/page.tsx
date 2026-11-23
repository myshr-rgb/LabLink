import { campusDate } from "@/lib/booking/time";
import Link from "next/link";
import { SearchBox } from "@/components/equipment/SearchBox";
import { page } from "@/components/ui/workflow-ui";

const topics = [
  ["FPGA boards", "FPGA"],
  ["3D printers", "3D printer"],
  ["Oscilloscopes", "oscilloscope"],
  ["GPU workstations", "GPU workstation"],
];
export default function Home(): React.JSX.Element {
  return (
    <main id="content" className={page + " space-y-12"}>
      <section className="rounded-2xl border border-border bg-gradient-to-br from-accent-soft to-bg p-6 shadow-sm sm:p-12">
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
            <Link
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 font-medium text-bg hover:bg-accent-hover"
              href={`/equipment?date=${campusDate(new Date())}`}
            >
              Free slots today
            </Link>
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
            [
              "Find equipment",
              "Search by name or filter the catalogue by department, category or access type.",
            ],
            [
              "Pick a slot",
              "Open an equipment page to see free times and choose a booking window in campus time (IST).",
            ],
            [
              "Get approval if required",
              "For equipment that needs approval, select your project and explain how you plan to use it.",
            ],
            [
              "Use the lab",
              "Check your confirmed booking for the equipment, lab location and reserved time.",
            ],
          ].map(([step, preview]) => (
            <li key={step}>
              <details
                className={
                  "rounded-xl border border-border bg-bg shadow-sm open:border-accent"
                }
              >
                <summary className="cursor-pointer p-4 font-semibold text-accent">
                  {step}
                </summary>
                <p className="mx-4 mb-4 border-t border-border pt-3 text-sm text-text-muted">
                  {preview}
                </p>
              </details>
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
