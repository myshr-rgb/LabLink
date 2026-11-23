import type { Priority, Project } from "@/types/workflow";
import { getDb } from "../client";

interface Row {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  guide_id: string;
  guide_name: string;
  deadline: string;
  priority: Priority;
  member_ids: string;
  equipment_ids: string;
}
const SELECT = `SELECT p.*,u.name guide_name,(SELECT json_group_array(m.user_id ORDER BY m.user_id) FROM project_members m WHERE m.project_id=p.id) member_ids,
 (SELECT json_group_array(pe.equipment_id ORDER BY pe.equipment_id) FROM project_equipment pe WHERE pe.project_id=p.id) equipment_ids
 FROM projects p JOIN users u ON u.id=p.guide_id`;
function map(r: Row): Project {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ownerId: r.owner_id,
    guideId: r.guide_id,
    guideName: r.guide_name,
    deadline: r.deadline,
    priority: r.priority,
    memberIds: JSON.parse(r.member_ids),
    equipmentIds: JSON.parse(r.equipment_ids),
  };
}
/** Fetch project details for service-side authorization. */
export function findProject(id: string): Project | undefined {
  const row = getDb()
    .prepare<[string], Row>(SELECT + " WHERE p.id=?")
    .get(id);
  if (row) return map(row);
}
/** Read projects visible to an owner, member, assigned guide or admin. */
export function visibleProjects(userId: string, admin: boolean): Project[] {
  return getDb()
    .prepare<{ userId: string; admin: number }, Row>(
      SELECT +
        ` WHERE @admin=1 OR p.owner_id=@userId OR p.guide_id=@userId
    OR EXISTS(SELECT 1 FROM project_members m WHERE m.project_id=p.id AND m.user_id=@userId) ORDER BY p.deadline,p.id`,
    )
    .all({ userId, admin: Number(admin) })
    .map(map);
}
export interface Person {
  id: string;
  name: string;
}
/** Expose only names and ids of active faculty and active students for team selection. */
export function projectPeople(role: "faculty" | "student"): Person[] {
  return getDb()
    .prepare<[string], Person>(
      "SELECT id,name FROM users WHERE role=? AND status='active' ORDER BY name,id",
    )
    .all(role);
}
/** Check a single project participant against their current DB role. */
export function activePerson(id: string, role: "student" | "faculty"): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM users WHERE id=? AND role=? AND status='active'")
    .get(id, role);
}
/** Create the project and replace its membership under the caller's transaction. */
export function saveProject(
  p: Omit<Project, "guideName">,
  now: Date,
  create: boolean,
): void {
  const db = getDb();
  const sql = create
    ? "INSERT INTO projects(id,title,description,owner_id,guide_id,deadline,priority,status,created_at,updated_at) VALUES (@id,@title,@description,@ownerId,@guideId,@deadline,@priority,'active',@now,@now)"
    : "UPDATE projects SET title=@title,description=@description,guide_id=@guideId,deadline=@deadline,priority=@priority,updated_at=@now WHERE id=@id";
  db.prepare(sql).run({ ...p, now: now.toISOString() });
  db.prepare("DELETE FROM project_members WHERE project_id=?").run(p.id);
  const add = db.prepare(
    "INSERT INTO project_members(project_id,user_id) VALUES (?,?)",
  );
  for (const id of p.memberIds) add.run(p.id, id);
  db.prepare("DELETE FROM project_equipment WHERE project_id=?").run(p.id);
  const equipment = db.prepare(
    "INSERT INTO project_equipment(project_id,equipment_id) VALUES (?,?)",
  );
  for (const id of new Set(p.equipmentIds)) equipment.run(p.id, id);
}
