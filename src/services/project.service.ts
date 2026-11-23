import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth/guards";
import { auditChange } from "@/lib/db/repositories/audit.repo";
import {
  activePerson,
  findProject,
  projectPeople,
  saveProject,
  visibleProjects,
  type Person,
} from "@/lib/db/repositories/project.repo";
import {
  findEquipment,
  findEquipmentList,
} from "@/lib/db/repositories/equipment.repo";
import { writeTransaction } from "@/lib/db/repositories/transaction";
import { AppError } from "@/lib/errors";
import type { ProjectInput, ProjectUpdate } from "@/lib/validation/workflow";
import type { Actor } from "@/types/domain";
import type { Project } from "@/types/workflow";

function checkProject(input: ProjectInput, now: Date): void {
  if (Date.parse(input.deadline) <= +now)
    throw new AppError("VALIDATION_ERROR", "Choose a future deadline.", {
      "body.deadline": "Choose a future deadline.",
    });
  if (!activePerson(input.guideId, "faculty"))
    throw new AppError("VALIDATION_ERROR", "Choose an active faculty guide.", {
      "body.guideId": "Choose an active faculty guide.",
    });
  if (!input.equipmentIds.every((id) => findEquipment(id)))
    throw new AppError(
      "VALIDATION_ERROR",
      "Choose equipment from the catalogue.",
    );
  if (!input.memberIds.every((id) => activePerson(id, "student")))
    throw new AppError(
      "VALIDATION_ERROR",
      "Choose active students as project members.",
    );
}
/** List only projects the caller can see. */
export function projects(actor: Actor | null): Project[] {
  const user = requireRole(actor);
  return visibleProjects(user.userId, user.role === "admin");
}
/** Read one project, returning 404 for foreign projects. */
export function projectDetail(actor: Actor | null, id: string): Project {
  const user = requireRole(actor);
  const p = findProject(id);
  if (
    !p ||
    !(
      p.ownerId === user.userId ||
      p.guideId === user.userId ||
      p.memberIds.includes(user.userId) ||
      user.role === "admin"
    )
  )
    throw new AppError("NOT_FOUND", "Project unavailable.");
  return p;
}
/** Return names and ids needed to select a faculty guide and team. */
export function projectOptions(actor: Actor | null): {
  guides: Person[];
  students: Person[];
  equipment: Person[];
} {
  requireRole(actor, ["student"]);
  return {
    guides: projectPeople("faculty"),
    students: projectPeople("student"),
    equipment: findEquipmentList({}).map(({ id, name }) => ({ id, name })),
  };
}
/** Create a student-owned project with server-assigned normal priority. */
export function createProject(
  actor: Actor | null,
  input: ProjectInput,
  now: Date,
): Project {
  const owner = requireRole(actor, ["student"]);
  return writeTransaction(() => {
    checkProject(input, now);
    const id = randomUUID();
    saveProject(
      {
        ...input,
        id,
        ownerId: owner.userId,
        memberIds: [...new Set([owner.userId, ...input.memberIds])],
        priority: "normal",
      },
      now,
      true,
    );
    auditChange(owner.userId, "project", id, "project.create", now, {});
    return projectDetail(owner, id);
  });
}
/** Owners edit project details. The assigned guide or an admin may set priority. */
export function updateProject(
  actor: Actor | null,
  id: string,
  input: ProjectUpdate,
  now: Date,
): Project {
  const user = requireRole(actor);
  return writeTransaction(() => {
    const p = projectDetail(user, id);
    const { priority, ...fields } = input;
    const editingDetails = Object.values(fields).some(
      (value) => value !== undefined,
    );
    if (!editingDetails && priority === undefined)
      throw new AppError("VALIDATION_ERROR", "Provide a project change.");
    if (editingDetails && p.ownerId !== user.userId)
      throw new AppError("NOT_FOUND", "Project unavailable.");
    if (
      priority !== undefined &&
      p.guideId !== user.userId &&
      user.role !== "admin"
    )
      throw new AppError(
        "FORBIDDEN",
        "Only the guide or an admin can set priority.",
      );
    const updated = {
      ...p,
      ...fields,
      priority: priority ?? p.priority,
      memberIds: [...new Set([p.ownerId, ...(input.memberIds ?? p.memberIds)])],
    };
    if (editingDetails) checkProject(updated, now);
    saveProject(updated, now, false);
    auditChange(user.userId, "project", id, "project.update", now, {
      priority: updated.priority,
    });
    return projectDetail(user, id);
  });
}
/** A request may be submitted by its project owner or an active team member. */
export function requestProject(actor: Actor, id: string): Project {
  const p = projectDetail(actor, id);
  if (p.ownerId !== actor.userId && !p.memberIds.includes(actor.userId))
    throw new AppError("NOT_FOUND", "Project unavailable.");
  return p;
}
