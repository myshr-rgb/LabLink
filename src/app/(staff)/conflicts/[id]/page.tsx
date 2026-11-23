import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ConflictReview } from "@/components/conflicts/ConflictReview";
import { page } from "@/components/ui/workflow-ui";
import { getConfig } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { windowLabel } from "@/lib/utils/format";
import { reviewConflict } from "@/services/conflict.service";
import { signedInViewer } from "@/services/viewer.service";

export const metadata = { title: "Review conflict · LabLink" };
export default async function ConflictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const actor = await signedInViewer();
  const { id } = await params;
  if (
    (actor.role !== "incharge" && actor.role !== "admin") ||
    !z.uuid().safeParse(id).success
  )
    notFound();
  try {
    const review = reviewConflict(actor, id, new Date());
    return (
      <main id="content" className={page + " space-y-5"}>
        <Link
          className="inline-flex min-h-11 items-center text-accent underline"
          href="/conflicts"
        >
          All conflicts
        </Link>
        <h1 className="text-3xl font-semibold">
          {review.group.equipmentName} conflict
        </h1>
        <p>
          {windowLabel(review.group.startAt, review.group.endAt)} ·{" "}
          {review.group.status === "open" ? "Open" : "Resolved"}
        </p>
        <ConflictReview
          review={review}
          aiEnabled={Boolean(getConfig().GEMINI_API_KEY)}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
