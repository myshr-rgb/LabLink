import { apiHandler } from "@/lib/security/api-handler";
import { idShape } from "@/lib/validation/equipment";
import { projectUpdate } from "@/lib/validation/workflow";
import { projectDetail, updateProject } from "@/services/project.service";
export const GET = apiHandler({
  auth: "user",
  bucket: { name: "project-detail", limit: 120, windowMs: 60000 },
  params: idShape,
  handler: ({ actor, params }) => projectDetail(actor, params.id),
});
export const PATCH = apiHandler({
  auth: "user",
  bucket: { name: "project-edit", limit: 120, windowMs: 60000 },
  params: idShape,
  body: projectUpdate,
  handler: ({ actor, params, body, now }) =>
    updateProject(actor, params.id, body, now),
});
