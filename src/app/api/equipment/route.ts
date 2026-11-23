import { apiHandler } from "@/lib/security/api-handler";
import { equipmentQuery } from "@/lib/validation/equipment";
import { catalogue, publicEquipment } from "@/services/equipment.service";
export const GET = apiHandler({
  auth: "public",
  bucket: { name: "equipment-list", limit: 120, windowMs: 60000 },
  query: equipmentQuery,
  handler: ({ query, now }) => {
    const result = catalogue(query, now);
    return { ...result, items: result.items.map(publicEquipment) };
  },
});
