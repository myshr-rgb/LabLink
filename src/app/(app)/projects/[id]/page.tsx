import { notFound } from "next/navigation";
import { z } from "zod";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectPriority } from "@/components/projects/ProjectPriority";
import { page } from "@/components/ui/workflow-ui";
import { AppError } from "@/lib/errors";
import { dayLabel, campusTime } from "@/lib/utils/format";
import { projectDetail, projectOptions } from "@/services/project.service";
import { signedInViewer } from "@/services/viewer.service";
export const metadata = { title: "Project details · LabLink" };

export default async function ProjectDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const actor = await signedInViewer();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  try {
    const project = projectDetail(actor, id);
    return (
      <main id="content" className={page + " space-y-5"}>
        <h1 className="text-3xl font-semibold">{project.title}</h1>
        <p className="max-w-prose whitespace-pre-wrap break-words">
          {project.description}
        </p>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-medium">Faculty guide</dt>
            <dd>{project.guideName}</dd>
          </div>
          <div>
            <dt className="font-medium">Deadline</dt>
            <dd>
              {dayLabel(project.deadline)}, {campusTime(project.deadline)} IST
            </dd>
          </div>
          <div>
            <dt className="font-medium">Priority</dt>
            <dd className="capitalize">{project.priority}</dd>
          </div>
          <div>
            <dt className="font-medium">Team and equipment</dt>
            <dd>
              {project.memberIds.length} members · {project.equipmentIds.length}{" "}
              equipment items
            </dd>
          </div>
        </dl>
        {project.ownerId === actor.userId && actor.role === "student" && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Edit project</h2>
            <ProjectForm project={project} {...projectOptions(actor)} />
          </section>
        )}
        {(actor.role === "admin" || project.guideId === actor.userId) && (
          <ProjectPriority project={project} />
        )}
      </main>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
