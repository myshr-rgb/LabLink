"use client";
import { useState } from "react";
import { control, secondary } from "@/components/ui/workflow-ui";
import type { DaySlots, Slot, Window } from "@/lib/booking/slots";
import { dayLabel } from "@/lib/utils/format";
import { SlotPicker } from "./SlotPicker";

interface Props {
  days: DaySlots[];
  date: string;
  onDate: (date: string) => void;
  selection: Window | null;
  maxMinutes: number;
  onSelect: (window: Window) => void;
}
export function AvailabilityGrid({
  days,
  date,
  onDate,
  selection,
  maxMinutes,
  onSelect,
}: Props): React.JSX.Element {
  const [list, setList] = useState(false);
  const slots = days.find((day) => day.date === date)?.slots ?? [];
  function select(slot: Slot): void {
    if (selection && slot.startAt >= selection.endAt) {
      const range = slots.filter(
        (value) =>
          value.startAt >= selection.startAt && value.endAt <= slot.endAt,
      );
      const minutes =
        (Date.parse(slot.endAt) - Date.parse(selection.startAt)) / 60_000;
      if (
        range[0]?.startAt === selection.startAt &&
        minutes <= maxMinutes &&
        range.every((value) => value.state === "free")
      ) {
        onSelect({ startAt: selection.startAt, endAt: slot.endAt });
        return;
      }
    }
    onSelect({ startAt: slot.startAt, endAt: slot.endAt });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label>
          Day
          <select
            aria-label="Booking day"
            className={control}
            value={date}
            onChange={(event) => onDate(event.target.value)}
          >
            {days.map((day) => (
              <option value={day.date} key={day.date}>
                {dayLabel(day.date)}
              </option>
            ))}
          </select>
        </label>
        <button
          className={secondary}
          type="button"
          aria-pressed={list}
          onClick={() => setList(!list)}
        >
          List view
        </button>
      </div>
      <p className="text-sm text-text-muted">
        Times are in IST. Choose a slot, then choose a later slot to extend it
        up to {maxMinutes} minutes.
      </p>
      {slots.length === 0 ? (
        <p className="rounded-lg bg-surface p-3">
          There are no bookable hours on this day. Choose another day.
        </p>
      ) : (
        <SlotPicker
          slots={slots}
          selected={selection}
          list={list}
          onPick={select}
        />
      )}
    </div>
  );
}
