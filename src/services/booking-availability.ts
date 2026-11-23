import { windowProblem } from "@/lib/booking/rules";
import { DAY_MS, SLOT_MS, type Window } from "@/lib/booking/slots";
import { campusDate } from "@/lib/booking/time";
import { slotsForDay } from "@/lib/booking/slots";
import { blockingWindows } from "@/lib/db/repositories/availability.repo";
import { userDepartment } from "@/lib/db/repositories/equipment.repo";
import { AppError } from "@/lib/errors";
import type { Equipment } from "@/types/equipment";
import type { Actor } from "@/types/domain";

const ALTERNATIVE_DAYS = 14;

/** Find up to three available windows of the requested length. */
export function alternatives(
  item: Equipment,
  window: Window,
  now: Date,
  except: string | null = null,
): Window[] {
  const end = new Date(+now + ALTERNATIVE_DAYS * DAY_MS).toISOString();
  const blocks = blockingWindows(
    { startAt: now.toISOString(), endAt: end },
    item.id,
    except,
  ).get(item.id);
  const duration = Date.parse(window.endAt) - Date.parse(window.startAt);
  const count = Math.max(1, duration / SLOT_MS);
  const result: Window[] = [];
  for (let day = 0; day < ALTERNATIVE_DAYS && result.length < 3; day++) {
    const slots = slotsForDay(
      campusDate(new Date(+now + day * DAY_MS)),
      item,
      now,
      blocks,
    );
    for (
      let index = 0;
      index + count <= slots.length && result.length < 3;
      index++
    ) {
      const span = slots.slice(index, index + count);
      if (span.every((slot) => slot.state === "free"))
        result.push({ startAt: span[0].startAt, endAt: span.at(-1)!.endAt });
    }
  }
  return result;
}
/** Check access, schedule and confirmed overlaps while the caller holds the write lock. */
export function checkWindow(
  actor: Actor,
  item: Equipment,
  window: Window,
  now: Date,
  except: string | null = null,
): void {
  if (
    item.accessType === "dept_only" &&
    userDepartment(actor.userId) !== item.departmentId
  )
    throw new AppError(
      "FORBIDDEN",
      "This equipment is reserved for its department.",
    );
  if (item.status !== "available")
    throw new AppError("SLOT_TAKEN", "This equipment is unavailable.", {
      alternatives: [],
    });
  const problem = windowProblem(window, item, now);
  if (problem)
    throw new AppError("VALIDATION_ERROR", problem, {
      "body.startAt": problem,
    });
  if (blockingWindows(window, item.id, except).has(item.id))
    throw new AppError(
      "SLOT_TAKEN",
      "That slot was just taken. Choose another time.",
      { alternatives: alternatives(item, window, now, except) },
    );
}
