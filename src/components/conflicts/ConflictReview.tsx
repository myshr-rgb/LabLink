"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/components/ui/api-request";
import { button, card, control, secondary } from "@/components/ui/workflow-ui";
import { windowLabel } from "@/lib/utils/format";
import type { ConflictReview as Review } from "@/services/conflict.service";
import { AlternativeList } from "./AlternativeList";
import { FactorBars } from "./FactorBars";

export function ConflictReview({
  review,
  aiEnabled,
}: {
  review: Review;
  aiEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [override, setOverride] = useState(false);
  const [chosen, setChosen] = useState(() =>
    review.ranked
      .filter((row) => row.outcome === "approved")
      .map((row) => row.bookingId),
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const open = review.group.status === "open";
  async function send(
    action: "accept" | "override" | "explain",
  ): Promise<void> {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "explain") {
        const result = await apiRequest<{ source: "ai" | "rules" }>(
          `/api/conflicts/${review.group.id}/explain`,
          "POST",
          {},
        );
        setMessage(
          result.source === "ai"
            ? "Explanations updated."
            : "Rule-based explanations are available below.",
        );
      } else {
        await apiRequest(`/api/conflicts/${review.group.id}/resolve`, "POST", {
          action,
          revision: review.revision,
          ...(action === "override" ? { winnerIds: chosen, reason } : {}),
        });
        setMessage("Conflict resolved. Students were notified.");
      }
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the decision.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4" aria-labelledby="ranked">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ranked" className="text-xl font-semibold">
          {open ? "Recommendation" : "Resolution"}
        </h2>
        {open && review.ranked.length > 0 && aiEnabled && (
          <button
            className={secondary}
            disabled={busy}
            onClick={() => void send("explain")}
          >
            Phrase explanations with AI
          </button>
        )}
      </div>
      <p className="text-sm text-text-muted">
        Lab staff make the final decision. Scores use deadlines, faculty
        priority, prior usage, wait time, and no-shows.
      </p>
      {review.ranked.length === 0 ? (
        <p className={card}>No requests are ready for ranking.</p>
      ) : (
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Ranked requests"
        >
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface">
              <tr>
                {[
                  "Rank",
                  "Request",
                  "Factors",
                  "Explanation and options",
                  ...(override && open ? ["Approve"] : []),
                ].map((label) => (
                  <th scope="col" className="p-3" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {review.ranked.map((row) => (
                <tr
                  key={row.bookingId}
                  className="border-b border-border align-top"
                >
                  <td className="p-3">
                    #{row.rank}
                    <br />
                    {row.score.toFixed(3)}
                  </td>
                  <td className="min-w-40 p-3">
                    <strong>{row.label}</strong>
                    <p className="text-sm">
                      {windowLabel(row.startAt, row.endAt)}
                    </p>
                    <p className="mt-2 font-medium">
                      {row.finalOutcome
                        ? row.finalOutcome === "approved"
                          ? "Approved"
                          : "Displaced"
                        : row.outcome === "approved"
                          ? "Recommended"
                          : "Would be displaced"}
                    </p>
                  </td>
                  <td className="p-3">
                    <FactorBars factors={row.factors} />
                  </td>
                  <td className="min-w-56 space-y-2 p-3">
                    <span className="rounded-full bg-accent-soft px-2 py-1 text-xs text-accent">
                      {row.aiReasonText ? "AI-assisted" : "Rule-based"}
                    </span>
                    <p>{row.aiReasonText ?? row.reasonText}</p>
                    {open && row.outcome === "displaced" && (
                      <AlternativeList items={row.alternatives} />
                    )}
                  </td>
                  {override && open && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="size-5"
                        aria-label={`Approve ${row.label}`}
                        checked={chosen.includes(row.bookingId)}
                        onChange={(event) =>
                          setChosen(
                            event.target.checked
                              ? [...chosen, row.bookingId]
                              : chosen.filter((id) => id !== row.bookingId),
                          )
                        }
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {review.awaiting.length > 0 && (
        <section className={card}>
          <h3 className="mb-2 font-semibold">Awaiting approval</h3>
          <ul className="list-disc space-y-1 pl-5">
            {review.awaiting.map((row) => (
              <li key={row.id}>
                {row.label} ·{" "}
                {row.status === "pending_approval"
                  ? "Faculty approval"
                  : "Lab clearance"}
              </li>
            ))}
          </ul>
        </section>
      )}
      {open && review.ranked.length > 0 && (
        <>
          {override && (
            <label>
              Override reason (10–500 characters)
              <textarea
                className={control}
                value={reason}
                minLength={10}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            {!override && (
              <button
                data-testid="conflict-accept"
                className={button}
                disabled={busy}
                onClick={() => void send("accept")}
              >
                Accept recommendation
              </button>
            )}
            <button
              data-testid="conflict-override"
              className={secondary}
              disabled={busy}
              onClick={() => setOverride(!override)}
            >
              {override ? "Back to recommendation" : "Choose differently"}
            </button>
            {override && (
              <button
                className={button}
                disabled={busy || reason.trim().length < 10}
                onClick={() => void send("override")}
              >
                Save decision
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
