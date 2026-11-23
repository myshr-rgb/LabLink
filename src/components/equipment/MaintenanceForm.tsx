"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/components/ui/api-request";
import { button, card, control } from "@/components/ui/workflow-ui";
import { fromCampusInput } from "@/lib/utils/format";
export function MaintenanceForm({ id }: { id: string }): React.JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await apiRequest<{ affected: number }>(
        `/api/equipment/${id}/maintenance`,
        "POST",
        {
          startAt: fromCampusInput(String(data.get("start"))),
          endAt: fromCampusInput(String(data.get("end"))),
          reason: data.get("reason"),
        },
      );
      setMessage(
        `Maintenance scheduled. ${result.affected} affected bookings.`,
      );
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not schedule maintenance.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className={card}>
      <summary className="cursor-pointer font-medium">
        Schedule maintenance
      </summary>
      <form onSubmit={submit} className="mt-3 grid max-w-xl gap-3">
        <label>
          Start (IST)
          <input
            type="datetime-local"
            name="start"
            required
            className={control}
          />
        </label>
        <label>
          End (IST)
          <input
            type="datetime-local"
            name="end"
            required
            className={control}
          />
        </label>
        <label>
          Reason
          <textarea
            name="reason"
            required
            maxLength={500}
            className={control}
          />
        </label>
        <button className={button} disabled={busy}>
          {busy ? "Scheduling…" : "Block the time"}
        </button>
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
