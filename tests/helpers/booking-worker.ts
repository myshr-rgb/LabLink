import { demoUserId } from "@/lib/auth/demo-identity";
import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { createBooking } from "@/services/booking.service";

const id = getDb()
  .prepare<[], string>("SELECT id FROM equipment WHERE name='Arduino Uno R4'")
  .pluck()
  .get()!;
try {
  const booking = createBooking(
    { role: "student", userId: demoUserId("student") },
    {
      equipmentId: id,
      startAt: "2026-11-23T03:30:00.000Z",
      endAt: "2026-11-23T04:00:00.000Z",
      justification: "",
    },
    new Date("2026-11-23T03:00:00Z"),
  );
  process.stdout.write(booking.status);
} catch (error) {
  if (error instanceof AppError && error.code === "SLOT_TAKEN")
    process.stdout.write(error.code);
  else throw error;
}
