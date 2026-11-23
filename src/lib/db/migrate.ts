import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";

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
    if (version === 2) return;
    if (version !== null && version !== 0 && version !== 1)
      throw new Error("Unsupported database version.");
    db.exec(readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8"));
    db.exec(`INSERT OR IGNORE INTO project_equipment(project_id,equipment_id)
      SELECT project_id,equipment_id FROM bookings WHERE project_id IS NOT NULL`);
    db.exec(
      "DELETE FROM schema_version; INSERT INTO schema_version(version) VALUES (2)",
    );
  }).immediate();
}
