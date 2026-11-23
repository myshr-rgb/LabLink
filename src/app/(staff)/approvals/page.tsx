import { notFound } from "next/navigation";
import { ApprovalDecision } from "@/components/approvals/ApprovalDecision";
import { card, EmptyState, page } from "@/components/ui/workflow-ui";
import { dayLabel, windowLabel } from "@/lib/utils/format";
import { approvals } from "@/services/approval.service";
import { signedInViewer } from "@/services/viewer.service";

export const metadata = { title: "Approvals · LabLink" };
export default async function ApprovalsPage(): Promise<React.JSX.Element> {
  const actor = await signedInViewer();
  if (actor.role !== "faculty" && actor.role !== "admin") notFound();
  const items = approvals(actor);
  return (
    <main id="content" className={page + " space-y-5"}>
      <h1 className="text-3xl font-semibold">Approvals</h1>
      {items.length === 0 ? (
        <EmptyState>
          There are no requests waiting for your decision.
        </EmptyState>
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => (
            <li key={item.id} className={card + " space-y-3"}>
              <h2 className="text-xl font-semibold">
                {item.equipmentName} · {item.studentName}
              </h2>
              <p>{windowLabel(item.startAt, item.endAt)}</p>
              <p className="text-text-muted">
                {item.projectTitle}
                {item.deadline && ` · Due ${dayLabel(item.deadline)}`}
              </p>
              <p className="whitespace-pre-wrap break-words">
                {item.justification}
              </p>
              <ApprovalDecision id={item.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
