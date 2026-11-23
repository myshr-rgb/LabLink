"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { button, control, secondary } from "@/components/ui/workflow-ui";
import type { EquipmentQuery } from "@/lib/validation/equipment";
import { ACCESS_LABELS } from "@/types/equipment";

type Props = {
  query: EquipmentQuery;
  departments: { code: string; name: string }[];
  categories: string[];
};
export function EquipmentFilters({
  query,
  departments,
  categories,
}: Props): React.JSX.Element {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mobile, setMobile] = useState(false);
  function filter(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget))
      if (typeof value === "string" && value.trim())
        params.set(key, value.trim());
    dialog.current?.close();
    setMobile(false);
    router.push("/equipment" + (params.size ? `?${params}` : ""));
  }
  function form(id: string): React.JSX.Element {
    return (
      <form
        action="/equipment"
        method="get"
        onSubmit={filter}
        data-testid={id}
        className="grid gap-3"
      >
        <label>
          Search
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={120}
            className={control}
          />
        </label>
        <label>
          Department
          <select
            name="department"
            aria-label="Department"
            defaultValue={query.department ?? ""}
            className={control}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            name="category"
            aria-label="Category"
            defaultValue={query.category ?? ""}
            className={control}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Available on
          <input
            type="date"
            name="date"
            defaultValue={query.date}
            className={control}
          />
        </label>
        <label>
          Access type
          <select
            name="accessType"
            aria-label="Access type"
            defaultValue={query.accessType ?? ""}
            className={control}
          >
            <option value="">All access types</option>
            {Object.entries(ACCESS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            name="sort"
            aria-label="Sort"
            defaultValue={query.sort}
            className={control}
          >
            <option value="match">Best match</option>
            <option value="name">Name, A to Z</option>
            <option value="name-desc">Name, Z to A</option>
          </select>
        </label>
        <button className={button}>Apply filters</button>
        <Link
          href="/equipment"
          className={secondary}
          onClick={() => dialog.current?.close()}
        >
          Clear filters
        </Link>
      </form>
    );
  }
  return (
    <aside aria-label="Catalogue filters">
      <div className="hidden sm:block">
        <h2 className="mb-3 font-semibold">Filters</h2>
        {form("equipment-filters")}
      </div>
      <button
        className={secondary + " sm:hidden"}
        onClick={() => {
          setMobile(true);
          dialog.current?.showModal();
        }}
      >
        Filters
      </button>
      <dialog
        ref={dialog}
        aria-label="Filters"
        onClose={() => setMobile(false)}
        className="max-h-[90dvh] w-[min(360px,90vw)] rounded-xl bg-bg p-4 backdrop:bg-text/40"
      >
        {mobile && form("mobile-equipment-filters")}
        <button
          className={secondary + " mt-3"}
          onClick={() => dialog.current?.close()}
        >
          Close filters
        </button>
      </dialog>
    </aside>
  );
}
