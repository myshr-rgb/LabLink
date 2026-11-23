import type { Block, Window } from "@/lib/booking/slots";
import { getDb } from "../client";

interface Row {
  equipment_id: string;
  start_at: string;
  end_at: string;
  state: Block["state"];
}
const BLOCKS = `SELECT equipment_id,start_at,end_at,'booked' state FROM bookings
 WHERE status IN ('approved','checked_in') AND start_at<@end AND end_at>@start
 AND (@equipment IS NULL OR equipment_id=@equipment) AND (@except IS NULL OR id<>@except)
 UNION ALL SELECT equipment_id,start_at,end_at,'maintenance' FROM maintenance_blocks
 WHERE start_at<@end AND end_at>@start AND (@equipment IS NULL OR equipment_id=@equipment)`;
/** Read confirmed bookings and maintenance only, restricted to intersecting times. */
export function blockingWindows(
  window: Window,
  equipment: string | null = null,
  except: string | null = null,
): Map<string, Block[]> {
  const rows = getDb()
    .prepare<
      {
        start: string;
        end: string;
        equipment: string | null;
        except: string | null;
      },
      Row
    >(BLOCKS)
    .all({ start: window.startAt, end: window.endAt, equipment, except });
  const groups = new Map<string, Block[]>();
  for (const row of rows) {
    const block = {
      startAt: row.start_at,
      endAt: row.end_at,
      state: row.state,
    };
    const existing = groups.get(row.equipment_id);
    if (existing) existing.push(block);
    else groups.set(row.equipment_id, [block]);
  }
  return groups;
}
