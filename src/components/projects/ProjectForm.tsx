"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/components/ui/api-request";
import { button, control } from "@/components/ui/workflow-ui";
import { fromCampusInput, toCampusInput } from "@/lib/utils/format";
import { projectSchema } from "@/lib/validation/workflow";
import type { Project } from "@/types/workflow";

interface Option {
  id: string;
  name: string;
}
interface Props {
  project?: Project;
  guides: Option[];
  students: Option[];
  equipment: Option[];
  returnTo?: string;
}
function Options({ options }: { options: Option[] }): React.JSX.Element {
  return (
    <>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </>
  );
}

export function ProjectForm({
  project,
  guides,
  students,
  equipment,
  returnTo,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = projectSchema.safeParse({
      title: form.get("title"),
      description: form.get("description"),
      guideId: form.get("guideId"),
      deadline: fromCampusInput(String(form.get("deadline"))),
      memberIds: form.getAll("memberIds"),
      equipmentIds: form.getAll("equipmentIds"),
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      setError(issue.message);
      const field = event.currentTarget.elements.namedItem(
        String(issue.path[0]),
      );
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const value = await apiRequest<Project>(
        project ? `/api/projects/${project.id}` : "/api/projects",
        project ? "PATCH" : "POST",
        result.data,
      );
      if (!project) router.push(returnTo ?? `/projects/${value.id}`);
      else {
        setSaved(true);
        router.refresh();
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the project.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4" aria-busy={busy}>
      <label>
        Project title
        <input
          className={control}
          name="title"
          defaultValue={project?.title}
          required
          maxLength={100}
        />
      </label>
      <label>
        Description
        <textarea
          className={control}
          name="description"
          defaultValue={project?.description}
          required
          maxLength={2000}
        />
      </label>
      <label>
        Faculty guide
        <select
          className={control}
          name="guideId"
          defaultValue={project?.guideId ?? ""}
          required
        >
          <option value="">Choose a faculty guide</option>
          <Options options={guides} />
        </select>
      </label>
      <label>
        Deadline (IST)
        <input
          className={control}
          type="datetime-local"
          name="deadline"
          defaultValue={project ? toCampusInput(project.deadline) : undefined}
          required
        />
      </label>
      <label>
        Team members (optional)
        <select
          multiple
          className={control}
          name="memberIds"
          defaultValue={project?.memberIds}
        >
          <Options options={students} />
        </select>
      </label>
      <label>
        Required equipment (optional)
        <select
          multiple
          className={control}
          name="equipmentIds"
          defaultValue={project?.equipmentIds}
        >
          <Options options={equipment} />
        </select>
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {saved && <p role="status">Project saved.</p>}
      <button disabled={busy} className={button + " justify-self-start"}>
        {busy ? "Saving…" : project ? "Save project" : "Create project"}
      </button>
    </form>
  );
}
