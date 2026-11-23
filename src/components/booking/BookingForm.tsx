"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AvailabilityGrid } from "@/components/equipment/AvailabilityGrid";
import { ApiError, apiRequest } from "@/components/ui/api-request";
import { button, card, secondary } from "@/components/ui/workflow-ui";
import type { DaySlots, Window } from "@/lib/booking/slots";
import { campusDate } from "@/lib/booking/time";
import { windowLabel } from "@/lib/utils/format";
import { bookingSchema, windowShape } from "@/lib/validation/workflow";
import type { Actor } from "@/types/domain";
import type { Equipment } from "@/types/equipment";
import type { Booking, Project } from "@/types/workflow";
import { RequestFields } from "./RequestFields";

const savedDraft = z.strictObject({
  window: z.strictObject(windowShape),
  projectId: z.string().max(36),
  purpose: z.string().max(1000),
});
const alternativesSchema = z.object({
  alternatives: z.array(z.strictObject(windowShape)),
});
type Draft = z.output<typeof savedDraft>;
interface Props {
  item: Pick<
    Equipment,
    "id" | "name" | "status" | "accessType" | "maxBookingMinutes"
  >;
  days: DaySlots[];
  actor: Actor | null;
  demoMode: boolean;
  projectChoices: Pick<Project, "id" | "title">[];
  editing?: Booking;
}
export function BookingForm({
  item,
  days,
  actor,
  demoMode,
  projectChoices,
  editing,
}: Props): React.JSX.Element {
  const router = useRouter();
  const storageKey = `lablink:booking:${editing?.id ?? item.id}`;
  const first =
    days.find((day) => day.slots.some((slot) => slot.state === "free"))?.date ??
    days[0].date;
  const [date, setDate] = useState(
    editing ? campusDate(new Date(editing.startAt)) : first,
  );
  const [draft, setDraft] = useState<Draft | null>(
    editing
      ? {
          window: { startAt: editing.startAt, endAt: editing.endAt },
          projectId: editing.projectId ?? "",
          purpose: editing.justification,
        }
      : null,
  );
  const [dialog, setDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<Window[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const approval = item.accessType === "approval";
  const label = editing
    ? editing.status === "changes_requested"
      ? "Resubmit request"
      : "Save changes"
    : approval
      ? "Send request"
      : "Book this slot";
  const returnTo = `/equipment/${item.id}${editing ? `?booking=${editing.id}` : ""}`;
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      const parsed = savedDraft.safeParse(saved ? JSON.parse(saved) : null);
      if (parsed.success) {
        const day = campusDate(new Date(parsed.data.window.startAt));
        setDraft(parsed.data);
        setDate(day);
      }
    } catch {
      /* Storage can be disabled. The in-memory draft still works. */
    }
  }, [storageKey]);

  function save(value: Draft | null): void {
    setDraft(value);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Keep using the in-memory draft. */
    }
  }
  function choose(window: Window): void {
    setMessage("");
    setOptions([]);
    setDate(campusDate(new Date(window.startAt)));
    save({
      window,
      projectId: draft?.projectId ?? "",
      purpose: draft?.purpose ?? "",
    });
  }
  async function book(value: Draft): Promise<void> {
    if (busy) return;
    const result = bookingSchema.safeParse({
      ...value.window,
      equipmentId: item.id,
      projectId: value.projectId || undefined,
      justification: value.purpose,
    });
    if (!result.success) {
      setMessage("Choose a valid booking time and project.");
      return;
    }
    if (approval && (!value.projectId || !value.purpose.trim())) {
      setMessage("Choose a project and explain why you need the equipment.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { equipmentId, ...fields } = result.data;
      const path = editing ? `/api/bookings/${editing.id}` : "/api/bookings";
      setBooking(
        await apiRequest<Booking>(
          path,
          editing ? "PATCH" : "POST",
          editing ? fields : { ...fields, equipmentId },
        ),
      );
      save(null);
      setOptions([]);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setDialog(true);
        return;
      }
      const parsed = alternativesSchema.safeParse(
        error instanceof ApiError ? error.details : null,
      );
      setOptions(parsed.success ? parsed.data.alternatives : []);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the booking. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function start(): void {
    if (!draft) return;
    if (!actor) {
      setDialog(true);
      return;
    }
    void book(draft);
  }
  if (booking)
    return (
      <section className={card + " space-y-3"} role="status">
        <h2 className="text-xl font-semibold">
          {booking.status === "approved" ? "Booking confirmed" : "Request sent"}
        </h2>
        <p>{windowLabel(booking.startAt, booking.endAt)}</p>
        {booking.status === "pending_approval" && (
          <p>
            Your faculty guide will review the request. Check Notifications for
            the decision.
          </p>
        )}
        <Link href="/bookings" className={button}>
          View my bookings
        </Link>
      </section>
    );
  return (
    <section className={card + " space-y-4"} aria-labelledby="choose-time">
      <h2 id="choose-time" className="text-xl font-semibold">
        {editing ? "Change booking" : "Choose a time"}
      </h2>
      <AvailabilityGrid
        days={days}
        date={date}
        onDate={setDate}
        selection={draft?.window ?? null}
        onSelect={choose}
        maxMinutes={item.maxBookingMinutes}
      />
      {draft && (
        <p aria-live="polite" className="rounded-lg bg-accent-soft p-3">
          Selected: {windowLabel(draft.window.startAt, draft.window.endAt)}
        </p>
      )}
      {approval && actor && draft && (
        <RequestFields
          projects={projectChoices}
          projectId={draft.projectId}
          justification={draft.purpose}
          onProject={(projectId) => save({ ...draft, projectId })}
          onPurpose={(purpose) => save({ ...draft, purpose })}
          returnTo={returnTo}
          decisionNote={editing?.decisionNote}
        />
      )}
      {message && (
        <p role="alert" className="text-danger">
          {message}
        </p>
      )}
      {options.length > 0 && (
        <div>
          <p className="mb-2 font-medium">Available alternatives</p>
          <ul className="grid gap-2">
            {options.map((option) => (
              <li key={option.startAt}>
                <button
                  type="button"
                  className={secondary}
                  onClick={() => choose(option)}
                >
                  {windowLabel(option.startAt, option.endAt)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="sticky bottom-0 bg-bg py-2 sm:static">
        <button
          type="button"
          className={button}
          data-testid="book-submit"
          disabled={!draft || busy || item.status !== "available"}
          onClick={start}
        >
          {busy
            ? "Saving…"
            : approval && !actor
              ? "Continue to request"
              : label}
        </button>
      </div>
      {draft && (
        <AuthDialog
          open={dialog}
          draft={draft}
          demoMode={demoMode}
          context={`Sign in to continue with ${item.name} on ${windowLabel(draft.window.startAt, draft.window.endAt)}.`}
          onClose={() => setDialog(false)}
          onResume={async (value) => {
            if (!approval || value.projectId) await book(value);
          }}
        />
      )}
    </section>
  );
}
