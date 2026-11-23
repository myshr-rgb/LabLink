"use client";
import { useState, type FormEvent } from "react";
import { button, control, secondary } from "@/components/ui/workflow-ui";
import { apiRequest } from "@/components/ui/api-request";
import { AiResults, type Suggestions } from "./AiResults";

export function SearchBox({
  value = "",
}: {
  value?: string;
}): React.JSX.Element {
  const [result, setResult] = useState<Suggestions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(event: FormEvent<HTMLFormElement>): Promise<void> {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (
      !(submitter instanceof HTMLButtonElement) ||
      submitter.value !== "suggest"
    )
      return;
    event.preventDefault();
    const query = String(
      new FormData(event.currentTarget).get("q") ?? "",
    ).trim();
    if (!query) {
      setError("Describe what you need or enter an equipment name.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await apiRequest<Suggestions>("/api/search/ai", "POST", { query }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load suggestions. Try keyword search.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <form
        action="/equipment"
        role="search"
        onSubmit={run}
        className="grid gap-2"
      >
        <label htmlFor="equipment-search" className="font-medium">
          Search equipment
        </label>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            id="equipment-search"
            type="search"
            name="q"
            defaultValue={value}
            maxLength={500}
            data-testid="search-input"
            placeholder="Try FPGA, oscilloscope, or Bluetooth"
            className={control}
          />
          <button className={button}>Search</button>
          <button
            className={secondary + " shrink-0"}
            value="suggest"
            disabled={busy}
          >
            {busy ? "Finding…" : "Get suggestions"}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {result && <AiResults data={result} />}
    </div>
  );
}
