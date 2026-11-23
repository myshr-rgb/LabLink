import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { equipmentDetail, publicEquipment } from "@/services/equipment.service";
export const GET = apiHandler({
  auth: "public",
  bucket: { name: "equipment-detail", limit: 120, windowMs: 60000 },
  params: idShape,
  handler: ({ params }) => publicEquipment(equipmentDetail(params.id)),
});
