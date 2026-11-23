import { randomUUID } from "node:crypto";
import { getDb } from "../client";

/** Record workflow state changes without including user-entered text. */
export function auditChange(
  actorId: string | null,
  entity: string,
  entityId: string,
  action: string,
  now: Date,
  metadata: object,
): void {
  getDb()
    .prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .run(
      randomUUID(),
      actorId,
      action,
      entity,
      entityId,
      JSON.stringify(metadata),
      now.toISOString(),
    );
}
