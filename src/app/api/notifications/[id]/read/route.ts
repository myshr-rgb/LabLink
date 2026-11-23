import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { markRead } from "@/services/notification.service";
export const POST = apiHandler({
  auth: "user",
  bucket: { name: "notification-read", limit: 120, windowMs: 60000 },
  params: idShape,
  handler: ({ actor, params, now }) => markRead(actor, params.id, now),
});
