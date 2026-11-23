import type { BookingStatus, BookingWindow } from "@/types/domain";
import { getDb } from "../client";

interface WindowRow {
  equipment_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
}
/** Read a booking's window for server-side scheduling checks. */
export function findBookingWindow(id: string): BookingWindow | undefined {
  const row = getDb()
    .prepare<[string], WindowRow>(
      "SELECT equipment_id, start_at, end_at, status FROM bookings WHERE id = ?",
    )
    .get(id);
  if (row)
    return {
      equipmentId: row.equipment_id,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
    };
}
