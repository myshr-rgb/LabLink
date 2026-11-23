import Link from "next/link";
import { card } from "@/components/ui/workflow-ui";
export interface Suggestions {
  source: "ai" | "rules";
  items: { id: string; name: string; lab: string; reason: string }[];
}
export function AiResults({ data }: { data: Suggestions }): React.JSX.Element {
  return (
    <section
      className={card + " space-y-3"}
      aria-live="polite"
      aria-label="Equipment suggestions"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">Equipment suggestions</h2>
        <span className="rounded-full bg-accent-soft px-2 py-1 text-sm text-accent">
          {data.source === "ai"
            ? "AI-assisted"
            : "Smart suggestions (rule-based)"}
        </span>
      </div>
      {data.items.length ? (
        <ul className="divide-y divide-border">
          {data.items.map((item) => (
            <li className="py-2" key={item.id}>
              <Link
                href={`/equipment/${item.id}`}
                className="inline-flex min-h-11 items-center font-medium text-accent underline"
              >
                {item.name}
              </Link>
              <p className="text-sm text-text-muted">
                {item.lab} · {item.reason}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>Try an equipment name, category, or a more specific term.</p>
      )}
    </section>
  );
}
