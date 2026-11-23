import Link from "next/link";
import { notFound } from "next/navigation";
import { page, card, EmptyState } from "@/components/ui/workflow-ui";
import { windowLabel } from "@/lib/utils/format";
import { conflicts } from "@/services/conflict.service";
import { signedInViewer } from "@/services/viewer.service";

export const metadata = { title: "Conflicts · LabLink" };
export default async function ConflictsPage(): Promise<React.JSX.Element> {
  const actor = await signedInViewer();
  if (actor.role !== "incharge" && actor.role !== "admin") notFound();
  const groups = conflicts(actor);
  return (
    <main id="content" className={page + " space-y-5"}>
      <h1 className="text-3xl font-semibold">Conflicts</h1>
      {groups.length ? (
        <ul className="grid gap-3">
          {groups.map((group) => (
            <li key={group.id} className={card}>
              <h2 className="text-lg font-semibold">
                <Link
                  href={`/conflicts/${group.id}`}
                  className="inline-flex min-h-11 items-center text-accent underline"
                >
                  {group.equipmentName}
                </Link>
              </h2>
              <p>
                {windowLabel(group.startAt, group.endAt)} ·{" "}
                {group.status === "open" ? "Open" : "Resolved"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>There are no conflicts for your labs.</EmptyState>
      )}
    </main>
  );
}
