import { randomUUID } from "node:crypto";
import type { Actor, Role } from "@/types/domain";
import { getDb } from "../client";

interface AccountRow {
  id: string;
  role: Role;
  password_hash: string;
  name: string;
}
export interface AuthAccount extends Actor {
  passwordHash: string;
  name: string;
}
function account(row: AccountRow | undefined): AuthAccount | undefined {
  if (row)
    return {
      userId: row.id,
      role: row.role,
      passwordHash: row.password_hash,
      name: row.name,
    };
}
/** Find an active account using the canonical email. */
export function findAccount(email: string): AuthAccount | undefined {
  return account(
    getDb()
      .prepare<[string], AccountRow>(
        "SELECT id,role,password_hash,name FROM users WHERE email=? AND status='active'",
      )
      .get(email),
  );
}
/** Resolve only the expected seeded demo identity and role. */
export function findDemoAccount(
  id: string,
  role: Role,
): AuthAccount | undefined {
  return account(
    getDb()
      .prepare<[string, Role], AccountRow>(
        "SELECT id,role,password_hash,name FROM users WHERE id=? AND role=? AND status='active' AND password_hash='!'",
      )
      .get(id, role),
  );
}
/** Store only server-assigned identity and privileges. */
export function insertStudent(
  input: {
    name: string;
    email: string;
    passwordHash: string;
    departmentCode?: string;
  },
  now: Date,
): Actor {
  const db = getDb();
  const department = input.departmentCode
    ? db
        .prepare<[string], { id: string }>(
          "SELECT id FROM departments WHERE code=?",
        )
        .get(input.departmentCode)
    : undefined;
  const userId = randomUUID();
  db.prepare(
    `INSERT INTO users(id,name,email,password_hash,role,department_id,status,created_at,updated_at)
    VALUES (?,?,?,?,'student',?,'active',?,?)`,
  ).run(
    userId,
    input.name,
    input.email,
    input.passwordHash,
    department?.id ?? null,
    now.toISOString(),
    now.toISOString(),
  );
  return { userId, role: "student" };
}
/** Keep multi-write authentication operations consistent. */
export function authTransaction<T>(work: () => T): T {
  return getDb().transaction(work).immediate();
}
/** Record outcomes with no credentials, email addresses or session identifiers. */
export function auditAuth(
  action: string,
  actor: Actor | null,
  now: Date,
): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log(id,actor_id,action,entity,entity_id,metadata,created_at)
    VALUES (?,?,?,'auth',?,'{}',?)`,
    )
    .run(
      randomUUID(),
      actor?.userId ?? null,
      action,
      actor?.userId ?? "anonymous",
      now.toISOString(),
    );
}
