import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { fixtureId } from "./fixture-id";

/** Upgrade existing and fresh databases in one write transaction. */
export function migrate(db: Database.Database): void {
  db.transaction(() => {
    const exists = db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_version'",
      )
      .get();
    const version = exists
      ? db.prepare("SELECT MAX(version) FROM schema_version").pluck().get()
      : null;
    if (version === 3) return;
    if (version !== null && version !== 0 && version !== 1 && version !== 2)
      throw new Error("Unsupported database version.");
    db.exec(readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8"));
    if (version !== 2)
      db.exec(`INSERT OR IGNORE INTO project_equipment(project_id,equipment_id)
      SELECT project_id,equipment_id FROM bookings WHERE project_id IS NOT NULL`);
    db.prepare(
      `UPDATE bookings SET incharge_approved_at=created_at
      WHERE conflict_group_id=? AND id IN (?,?,?) AND status='faculty_approved' AND incharge_approved_at IS NULL`,
    ).run(fixtureId(10, 0), fixtureId(9, 0), fixtureId(9, 1), fixtureId(9, 2));
    db.exec(
      "DELETE FROM schema_version; INSERT INTO schema_version(version) VALUES (3)",
    );
  }).immediate();
}
