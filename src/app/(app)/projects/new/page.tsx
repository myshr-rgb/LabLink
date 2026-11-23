import { notFound } from "next/navigation";
import { z } from "zod";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { page } from "@/components/ui/workflow-ui";
import { projectOptions } from "@/services/project.service";
import { signedInViewer } from "@/services/viewer.service";

export const metadata = { title: "Create project · LabLink" };
const query = z
  .object({
    returnTo: z
      .string()
      .regex(/^\/equipment\/[\da-f-]{36}(?:\?booking=[\da-f-]{36})?$/i)
      .optional(),
  })
  .strict();
export default async function NewProject({
  searchParams,
}: {
  searchParams: Promise<Record<string, unknown>>;
}): Promise<React.JSX.Element> {
  const actor = await signedInViewer();
  if (actor.role !== "student") notFound();
  const parsed = query.safeParse(await searchParams);
  return (
    <main id="content" className={page + " space-y-5"}>
      <h1 className="text-3xl font-semibold">Create a project</h1>
      <ProjectForm
        {...projectOptions(actor)}
        returnTo={parsed.success ? parsed.data.returnTo : undefined}
      />
    </main>
  );
}
