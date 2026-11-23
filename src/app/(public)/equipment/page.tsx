import type { Metadata } from "next";
import Link from "next/link";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { EmptyState, page, secondary } from "@/components/ui/workflow-ui";
import {
  equipmentSearch,
  type EquipmentQuery,
} from "@/lib/validation/equipment";
import { catalogue, equipmentFacets } from "@/services/equipment.service";

export const metadata: Metadata = { title: "Equipment · LabLink" };
function pageLink(query: EquipmentQuery, next: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page: next }))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return `/equipment?${params}`;
}
export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const parsed = equipmentSearch.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <main id="content" className={page}>
        <h1 className="mb-4 text-3xl font-semibold">Equipment</h1>
        <EmptyState href="/equipment" label="Clear filters">
          These filters are invalid. Clear them and try again.
        </EmptyState>
      </main>
    );
  const query = parsed.data;
  const result = catalogue(query, new Date());
  const pages = Math.ceil(result.total / result.pageSize);
  return (
    <main id="content" className={page + " space-y-6"}>
      <h1 className="text-3xl font-semibold">Equipment</h1>
      <div className="grid gap-6 sm:grid-cols-[190px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <EquipmentFilters
          key={JSON.stringify(query)}
          query={query}
          {...equipmentFacets()}
        />
        <section aria-label="Search results" className="space-y-4">
          <p role="status" className="text-text-muted">
            {result.total} equipment {result.total === 1 ? "item" : "items"}
          </p>
          {result.items.length === 0 ? (
            <EmptyState
              href={pages ? pageLink(query, 1) : "/equipment"}
              label={pages ? "Back to page 1" : "Clear filters"}
            >
              {pages
                ? "This page has no equipment."
                : "No equipment matches these filters. Clear filters or try a broader search."}
            </EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.items.map((item) => (
                <EquipmentCard item={item} key={item.id} />
              ))}
            </div>
          )}
          {pages > 1 && (
            <nav
              aria-label="Equipment results pages"
              className="flex flex-wrap items-center gap-3"
            >
              {result.page > 1 && (
                <Link
                  className={secondary}
                  href={pageLink(query, result.page - 1)}
                >
                  Previous
                </Link>
              )}
              {result.page <= pages && (
                <span>
                  Page {result.page} of {pages}
                </span>
              )}
              {result.page < pages && (
                <Link
                  className={secondary}
                  href={pageLink(query, result.page + 1)}
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
