"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/components/ui/api-request";
import { secondary } from "@/components/ui/workflow-ui";
export function MarkNotification({ id }: { id: string }): React.JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function mark(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/notifications/${id}/read`, "POST", {});
      router.refresh();
    } catch {
      setError("Could not mark this notification as read. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className={secondary} disabled={busy} onClick={() => void mark()}>
        {busy ? "Saving…" : "Mark as read"}
      </button>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
