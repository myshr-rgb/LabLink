import { apiHandler } from "@/lib/security/api-handler";
import { bookingShape } from "@/lib/validation/workflow";
import { createBooking, myBookings } from "@/services/booking.service";
export const GET = apiHandler({
  auth: "user",
  bucket: { name: "bookings-list", limit: 120, windowMs: 60000 },
  handler: ({ actor, now }) => myBookings(actor, now),
});
export const POST = apiHandler({
  auth: "user",
  bucket: { name: "bookings-create", limit: 30, windowMs: 600000 },
  body: bookingShape,
  handler: ({ actor, body, now }) => createBooking(actor, body, now),
});
