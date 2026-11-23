"use client";
import Link from "next/link";
import { control } from "@/components/ui/workflow-ui";
import type { Project } from "@/types/workflow";

export function RequestFields({
  projects,
  projectId,
  justification,
  onProject,
  onPurpose,
  returnTo,
  decisionNote,
}: {
  projects: Pick<Project, "id" | "title">[];
  projectId: string;
  justification: string;
  onProject: (id: string) => void;
  onPurpose: (value: string) => void;
  returnTo: string;
  decisionNote?: string | null;
}): React.JSX.Element {
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
    </div>
  );
}
