import type { Alternative } from "@/lib/allocation/types";
import { windowLabel } from "@/lib/utils/format";
export function AlternativeList({
  items,
}: {
  items: Alternative[];
}): React.JSX.Element {
  if (!items.length)
    return (
      <p className="text-sm text-text-muted">
        No compatible window found within the search period.
      </p>
    );
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.equipmentId + item.startAt + item.endAt}>
          <strong>{item.equipmentName}</strong>
          <br />
          {item.lab} · {windowLabel(item.startAt, item.endAt)}
        </li>
      ))}
    </ul>
  );
}
