"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/components/ui/api-request";
import { button, secondary } from "@/components/ui/workflow-ui";

export function CancelBooking({ id }: { id: string }): React.JSX.Element {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function cancel(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/bookings/${id}`, "DELETE", {});
      setConfirm(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not cancel the booking.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!confirm)
    return (
      <button className={secondary} onClick={() => setConfirm(true)}>
        Cancel booking
      </button>
    );
  return (
    <div className="space-y-2">
      <p>Cancel this booking?</p>
      <div className="flex flex-wrap gap-2">
        <button
          className={button}
          disabled={busy}
          onClick={() => void cancel()}
        >
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          className={secondary}
          disabled={busy}
          onClick={() => setConfirm(false)}
        >
          Keep booking
        </button>
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
