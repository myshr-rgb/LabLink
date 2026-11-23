import { apiHandler } from "@/lib/security/api-handler";
import { projectShape } from "@/lib/validation/workflow";
import { createProject, projects } from "@/services/project.service";
export const GET = apiHandler({
  auth: "user",
  bucket: { name: "projects-list", limit: 120, windowMs: 60000 },
  handler: ({ actor }) => projects(actor),
});
export const POST = apiHandler({
  auth: "user",
  bucket: { name: "project-create", limit: 120, windowMs: 60000 },
  body: projectShape,
  handler: ({ actor, body, now }) => createProject(actor, body, now),
});
