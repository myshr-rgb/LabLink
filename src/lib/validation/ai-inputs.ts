import { z } from "zod";
export const aiSearchShape = { query: z.string().trim().min(1).max(500) };
export const aiDraftShape = { projectId: z.uuid(), equipmentId: z.uuid() };
