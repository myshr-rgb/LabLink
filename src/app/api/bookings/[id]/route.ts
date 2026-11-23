import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { bookingUpdate } from "@/lib/validation/workflow";
import {
  bookingDetail,
  cancelBooking,
  modifyBooking,
} from "@/services/booking.service";
export const GET = apiHandler({
  auth: "user",
  bucket: { name: "booking-detail", limit: 120, windowMs: 60000 },
  params: idShape,
  handler: ({ actor, params, now }) => bookingDetail(actor, params.id, now),
});
export const PATCH = apiHandler({
  auth: "user",
  bucket: { name: "booking-edit", limit: 120, windowMs: 60000 },
  params: idShape,
  body: bookingUpdate,
  handler: ({ actor, params, body, now }) =>
    modifyBooking(actor, params.id, body, now),
});
export const DELETE = apiHandler({
  auth: "user",
  bucket: { name: "booking-cancel", limit: 120, windowMs: 60000 },
  params: idShape,
  handler: ({ actor, params, now }) => cancelBooking(actor, params.id, now),
});
