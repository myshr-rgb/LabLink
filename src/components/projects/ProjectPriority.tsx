"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/components/ui/api-request";
import { control, secondary } from "@/components/ui/workflow-ui";
import { projectUpdateSchema } from "@/lib/validation/workflow";
import type { Project } from "@/types/workflow";

export function ProjectPriority({
  project,
}: {
  project: Project;
}): React.JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = projectUpdateSchema.safeParse({
      priority: new FormData(event.currentTarget).get("priority"),
    });
    if (!input.success) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      await apiRequest(`/api/projects/${project.id}`, "PATCH", input.data);
      setMessage("Priority saved.");
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error ? error.message : "Could not save priority.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="grid max-w-sm gap-2">
      <label>
        Project priority
        <select
          className={control}
          name="priority"
          defaultValue={project.priority}
        >
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Deadline-critical</option>
        </select>
      </label>
      <button className={secondary} disabled={busy}>
        {busy ? "Saving…" : "Save priority"}
      </button>
      {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    </form>
  );
}
