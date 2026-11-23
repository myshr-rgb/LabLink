"use client";
import { useState } from "react";
import { apiRequest } from "@/components/ui/api-request";
import Link from "next/link";
import { control, secondary } from "@/components/ui/workflow-ui";
import type { Project } from "@/types/workflow";

export function RequestFields({
  projects,
  equipmentId,
  projectId,
  justification,
  onProject,
  onPurpose,
  returnTo,
  decisionNote,
}: {
  equipmentId: string;
  projects: Pick<Project, "id" | "title">[];
  projectId: string;
  justification: string;
  onProject: (id: string) => void;
  onPurpose: (value: string) => void;
  returnTo: string;
  decisionNote?: string | null;
}): React.JSX.Element {
  const [source, setSource] = useState<"ai" | "rules" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function suggest(): Promise<void> {
    setBusy(true);
    setError("");
    setSource(null);
    try {
      const response = await apiRequest<{
        result: string;
        source: "ai" | "rules";
      }>("/api/bookings/justification", "POST", { projectId, equipmentId });
      onPurpose(response.result);
      setSource(response.source);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not suggest text.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3">
      {decisionNote && (
        <p className="rounded-lg bg-surface p-3">
          Guide feedback: {decisionNote}
        </p>
      )}
      <label>
        Project
        <select
          value={projectId}
          name="project"
          aria-label="Project"
          className={control}
          onChange={(event) => onProject(event.target.value)}
        >
          <option value="">Choose a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </label>
      <Link
        href={`/projects/new?returnTo=${encodeURIComponent(returnTo)}`}
        className="inline-flex min-h-11 items-center text-accent underline"
      >
        Create a project
      </Link>
      <label>
        Purpose
        <textarea
          className={control}
          value={justification}
          maxLength={1000}
          onChange={(event) => onPurpose(event.target.value)}
        />
      </label>
      <button
        type="button"
        className={secondary + " justify-self-start"}
        disabled={busy || !projectId}
        onClick={() => void suggest()}
      >
        {busy ? "Drafting…" : "Suggest justification"}
      </button>
      {source && (
        <p role="status">
          {source === "ai" ? "AI-assisted" : "Rule-based"} suggestion. Review
          the text before sending.
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
