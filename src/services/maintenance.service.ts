import { findAlternatives } from "@/lib/allocation/alternatives";
import { requireRole } from "@/lib/auth/guards";
import { DAY_MS, type Window } from "@/lib/booking/slots";
import { auditChange } from "@/lib/db/repositories/audit.repo";
import { blockingWindows } from "@/lib/db/repositories/availability.repo";
import { findBooking } from "@/lib/db/repositories/booking.repo";
import {
  findEquipmentList,
  userDepartment,
} from "@/lib/db/repositories/equipment.repo";
import {
  affectedBookings,
  insertMaintenance,
} from "@/lib/db/repositories/maintenance.repo";
import { insertNotice } from "@/lib/db/repositories/notification.repo";
import { writeTransaction } from "@/lib/db/repositories/transaction";
import { AppError } from "@/lib/errors";
import { windowLabel } from "@/lib/utils/format";
import type { Actor } from "@/types/domain";
import { applyEvent, sweepExpired } from "./booking-state";
import { invalidateCatalogue } from "./catalogue-cache";
import { alternativeLink } from "./conflict.service";
import { equipmentDetail } from "./equipment.service";

/** Reserve maintenance and notify affected owners in one transaction. */
export function scheduleMaintenance(
  actor: Actor | null,
  itemId: string,
  window: Window,
  reason: string,
  now: Date,
): { id: string; affected: number } {
  const reviewer = requireRole(actor, ["incharge", "admin"]);
  const item = equipmentDetail(itemId);
  if (reviewer.role !== "admin" && item.inChargeId !== reviewer.userId)
    throw new AppError("NOT_FOUND", "Equipment unavailable.");
  if (Date.parse(window.startAt) < +now || window.startAt >= window.endAt)
    throw new AppError(
      "VALIDATION_ERROR",
      "Choose a future maintenance interval.",
    );
  sweepExpired(now);
  const result = writeTransaction(() => {
    const affected = affectedBookings(itemId, window);
    if (affected.some((row) => row.status === "checked_in"))
      throw new AppError(
        "SLOT_TAKEN",
        "A checked-in booking overlaps this time.",
      );
    const id = insertMaintenance(itemId, window, reason, reviewer.userId);
    const bookings = affected.map((row) => findBooking(row.id)!);
    for (const booking of bookings)
      applyEvent(booking, "maintenance", reviewer.userId, now, reason);
    const range = {
      startAt: [
        window.startAt,
        ...bookings.map((row) => row.startAt),
      ].sort()[0],
      endAt: new Date(
        Date.parse(
          [window.endAt, ...bookings.map((row) => row.endAt)].sort().at(-1)!,
        ) +
          7 * DAY_MS,
      ).toISOString(),
    };
    const blocks = blockingWindows(range);
    const compatible = findEquipmentList({ category: item.category }).filter(
      (row) => row.status === "available",
    );
    for (const booking of bookings) {
      const dept = userDepartment(booking.userId);
      const options = compatible
        .filter(
          (row) => row.accessType !== "dept_only" || row.departmentId === dept,
        )
        .map((row) => ({ ...row, blocks: blocks.get(row.id) ?? [] }));
      const proposals = findAlternatives(
        {
          ...booking,
          createdAt: now.toISOString(),
          hoursUsed14d: 0,
          noShows60d: 0,
          priority: "normal",
        },
        { ...item, blocks: blocks.get(item.id) ?? [] },
        options,
        [],
        now,
      );
      insertNotice(
        booking.userId,
        "maintenance.reschedule",
        "Booking affected by maintenance",
        reason,
        `/equipment/${itemId}`,
        now,
      );
      for (const option of proposals)
        insertNotice(
          booking.userId,
          "maintenance.alternative",
          "Request alternative",
          `${option.equipmentName} · ${windowLabel(option.startAt, option.endAt)}`,
          alternativeLink(option),
          now,
        );
    }
    auditChange(
      reviewer.userId,
      "equipment",
      itemId,
      "maintenance.create",
      now,
      { id, affected: affected.map((row) => row.id) },
    );
    return { id, affected: affected.length };
  });
  invalidateCatalogue();
  return result;
}
