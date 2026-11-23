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
      <Image
        src={item.imagePath}
        alt=""
        width={56}
        height={56}
        className="rounded-lg"
        unoptimized
      />
      <h2 className="text-lg font-semibold">{item.name}</h2>
      <p className="text-sm text-text-muted">
        {item.lab} · {item.department}
      </p>
      <p className="text-sm text-text-muted">{item.location}</p>
      <div className="mt-auto flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-surface px-2 py-1">
          <span aria-hidden="true">● </span>
          {item.status === "available" ? "Available" : "Maintenance"}
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
