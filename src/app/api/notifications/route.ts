import { apiHandler } from "@/lib/security/api-handler";
import { z } from "zod";
import {
  notifications,
  unreadNotificationCount,
} from "@/services/notification.service";
export const GET = apiHandler({
  auth: "user",
  bucket: { name: "notifications", limit: 120, windowMs: 60000 },
  query: { countOnly: z.literal("true").optional() },
  handler: ({ actor, query }) =>
    query.countOnly
      ? { unread: unreadNotificationCount(actor) }
      : notifications(actor),
});
