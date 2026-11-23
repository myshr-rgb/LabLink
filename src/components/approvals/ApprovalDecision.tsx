"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/components/ui/api-request";
import { button, control, secondary } from "@/components/ui/workflow-ui";
import { decisionSchema } from "@/lib/validation/workflow";

export function ApprovalDecision({ id }: { id: string }): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const decision =
      submitter instanceof HTMLButtonElement ? submitter.value : "approve";
    const result = decisionSchema.safeParse({
      decision,
      comment: new FormData(event.currentTarget).get("comment"),
    });
    if (!result.success) return;
    if (result.data.decision !== "approve" && !result.data.comment) {
      setError("Add a comment for the student.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/approvals/${id}/decision`, "POST", result.data);
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
    <form onSubmit={submit} className="grid gap-2" aria-busy={busy}>
      <label>
        Comment <textarea name="comment" className={control} maxLength={1000} />
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          value="approve"
          className={button}
          data-testid="approve-request"
        >
          Approve
        </button>
        <button disabled={busy} value="changes" className={secondary}>
          Request changes
        </button>
        <button
          disabled={busy}
          value="reject"
          className={secondary}
          data-testid="reject-request"
        >
          Reject
        </button>
      </div>
    </form>
  );
}
