import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { MaintenanceForm } from "@/components/equipment/MaintenanceForm";
import { BookingForm } from "@/components/booking/BookingForm";
import { ACCESS_LABELS } from "@/types/equipment";
import { card, page } from "@/components/ui/workflow-ui";
import { getConfig } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { bookingDetail } from "@/services/booking.service";
import {
  equipmentAvailability,
  equipmentDetail,
  similarEquipment,
} from "@/services/equipment.service";
import { projects } from "@/services/project.service";
import { viewer } from "@/services/viewer.service";

const route = z.strictObject({
  booking: z.uuid().optional(),
  start: z.iso.datetime().optional(),
  end: z.iso.datetime().optional(),
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<{ title: string }> {
  try {
    return { title: `${equipmentDetail((await params).id).name} · LabLink` };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND")
      return { title: "Equipment unavailable · LabLink" };
    throw error;
  }
}
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, unknown>>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const parsed = route.safeParse(await searchParams);
  if (!z.uuid().safeParse(id).success || !parsed.success) notFound();
  const actor = await viewer();
  const now = new Date();
  try {
    const item = equipmentDetail(id);
    const similar = similarEquipment(item);
    const editId = parsed.data.booking;
    if (editId && !actor) notFound();
    const editing = editId ? bookingDetail(actor, editId, now) : undefined;
    if (editing && editing.equipmentId !== id) notFound();
    const choices =
      actor?.role === "student"
        ? projects(actor).filter(
            (p) =>
              p.memberIds.includes(actor.userId) || p.ownerId === actor.userId,
          )
        : [];
    const { name, status, accessType, maxBookingMinutes } = item;
    return (
      <main id="content" className={page + " space-y-5"}>
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          <Link href="/" className="underline">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/equipment" className="underline">
            Equipment
          </Link>{" "}
          / {item.name}
        </nav>
        <h1 className="text-3xl font-semibold">{name}</h1>
        <p>
          <span aria-hidden="true">● </span>
          {status === "available" ? "Available" : "Maintenance"} ·{" "}
          {ACCESS_LABELS[accessType]}
        </p>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className={card + " space-y-3"}>
            <h2 className="text-xl font-semibold">Equipment details</h2>
            <p>
              {item.lab} · {item.department}
            </p>
            <p className="text-text-muted">{item.location}</p>
            <p>
              Lab hours: {item.openTime}–{item.closeTime} IST. Book up to{" "}
              {maxBookingMinutes} minutes at a time.
            </p>
            <dl className="grid gap-2">
              {Object.entries(item.specs).map(([key, value]) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 border-t border-border pt-2"
                  key={key}
                >
                  <dt className="capitalize font-medium">{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <BookingForm
            key={editId ?? id}
            item={{ id, name, status, accessType, maxBookingMinutes }}
            days={equipmentAvailability(id, now, editing?.id)}
            editing={editing}
            prefill={
              parsed.data.start &&
              parsed.data.end &&
              parsed.data.start < parsed.data.end
                ? { startAt: parsed.data.start, endAt: parsed.data.end }
                : undefined
            }
            actor={actor}
            demoMode={getConfig().DEMO_MODE}
            projectChoices={choices.map(({ id, title }) => ({ id, title }))}
          />
        </div>
        {(actor?.role === "admin" ||
          (actor?.role === "incharge" && actor.userId === item.inChargeId)) && (
          <MaintenanceForm id={id} />
        )}
        {similar.length > 0 && (
          <section aria-label="Similar equipment" className="space-y-3">
            <h2 className="text-xl font-semibold">Similar equipment</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((row) => (
                <EquipmentCard key={row.id} item={row} />
              ))}
            </div>
          </section>
        )}
      </main>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
