import Image from "next/image";
import Link from "next/link";
import { card, secondary } from "@/components/ui/workflow-ui";
import { ACCESS_LABELS, type Equipment } from "@/types/equipment";

export function EquipmentCard({
  item,
}: {
  item: Equipment;
}): React.JSX.Element {
  return (
    <article className={card + " flex flex-col gap-3"}>
      <div className="flex items-center justify-between gap-2">
        <Image
          src={item.imagePath}
          alt=""
          width={56}
          height={56}
          className="rounded-lg"
          unoptimized
        />
        <span className="rounded-full border border-border bg-surface px-2 py-1 text-sm font-medium">
          <span
            aria-hidden="true"
            className={
              item.status === "available" ? "text-success" : "text-warning"
            }
          >
            &#9679;{" "}
          </span>
          {item.status === "available" ? "Available" : "Maintenance"}
        </span>
      </div>
      <h2 className="text-lg font-semibold">{item.name}</h2>
      <p className="text-sm text-text-muted">
        {item.lab} · {item.department}
      </p>
      <p className="text-sm text-text-muted">{item.location}</p>
      <div className="mt-auto flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-surface px-2 py-1">
          Up to {item.maxBookingMinutes} min per booking
        </span>
        <span className="rounded-full bg-accent-soft px-2 py-1 text-accent">
          {ACCESS_LABELS[item.accessType]}
        </span>
      </div>
      <Link
        href={`/equipment/${item.id}`}
        aria-label={`View ${item.name}`}
        className={secondary + " self-start"}
      >
        View
      </Link>
    </article>
  );
}
