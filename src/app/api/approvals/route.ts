import { apiHandler } from "@/lib/security/api-handler";
import { approvals } from "@/services/approval.service";
export const GET = apiHandler({
  auth: { roles: ["faculty", "admin"] },
  bucket: { name: "approval-queue", limit: 120, windowMs: 60000 },
  handler: ({ actor }) => approvals(actor),
});
