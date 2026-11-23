import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { equipmentAvailability } from "@/services/equipment.service";
export const GET = apiHandler({
  auth: "public",
  bucket: { name: "equipment-availability", limit: 120, windowMs: 60000 },
  params: idShape,
  handler: ({ params, now }) => equipmentAvailability(params.id, now),
});
