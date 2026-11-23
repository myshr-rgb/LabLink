"use client";
import { useRef, type KeyboardEvent } from "react";
import type { Slot, Window } from "@/lib/booking/slots";
import { campusTime } from "@/lib/utils/format";

interface Props {
  slots: Slot[];
  selected: Window | null;
  list: boolean;
  onPick: (slot: Slot) => void;
}
const status = {
  free: "Free",
  booked: "Taken",
  maintenance: "Unavailable",
} as const;
export function SlotPicker({
  slots,
  selected,
  list,
  onPick,
}: Props): React.JSX.Element {
  const root = useRef<HTMLUListElement>(null);
  function navigate(event: KeyboardEvent<HTMLButtonElement>): void {
    const controls = Array.from(
      root.current?.querySelectorAll("button:not(:disabled)") ?? [],
    ) as HTMLButtonElement[];
    const index = controls.indexOf(event.currentTarget);
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? controls.length - 1
          : Math.max(0, Math.min(controls.length - 1, index + delta));
    controls[target]?.focus();
  }
  return (
    <ul
      ref={root}
      aria-label="Time slots in IST"
      className={list ? "grid gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}
    >
      {slots.map((slot) => {
        const active =
          !!selected &&
          slot.startAt >= selected.startAt &&
          slot.endAt <= selected.endAt;
        return (
          <li key={slot.startAt}>
            <button
              type="button"
              data-testid="slot-button"
              onKeyDown={navigate}
              disabled={slot.state !== "free"}
              aria-pressed={active}
              onClick={() => onPick(slot)}
              className={`min-h-11 w-full rounded-lg border px-2 py-2 text-left ${active ? "border-accent bg-accent text-bg" : "border-border-strong bg-bg disabled:bg-surface disabled:text-text-muted"}`}
            >
              <span className="font-medium">
                {campusTime(slot.startAt)}
                {list && `–${campusTime(slot.endAt)}`}
              </span>
              <span className="ml-2 text-sm">{status[slot.state]}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
