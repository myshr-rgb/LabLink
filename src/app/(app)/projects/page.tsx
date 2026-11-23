import Link from "next/link";
import { button, card, EmptyState, page } from "@/components/ui/workflow-ui";
import { dayLabel } from "@/lib/utils/format";
import { projects } from "@/services/project.service";
import { signedInViewer } from "@/services/viewer.service";
export const metadata = { title: "Projects · LabLink" };

export default async function ProjectsPage(): Promise<React.JSX.Element> {
  const actor = await signedInViewer();
  const items = projects(actor);
  return (
    <main id="content" className={page + " space-y-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Projects</h1>
        {actor.role === "student" && (
          <Link href="/projects/new" className={button}>
            Create a project
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState>You have no projects to view.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((project) => (
            <li key={project.id} className={card}>
              <h2 className="text-xl font-semibold">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-accent underline"
                >
                  {project.title}
                </Link>
              </h2>
              <p className="mt-2 text-text-muted">
                {project.guideName} · Due {dayLabel(project.deadline)} ·{" "}
                {project.memberIds.length} team members
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
