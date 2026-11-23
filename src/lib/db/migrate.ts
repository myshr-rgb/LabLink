import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";

/** Upgrade fresh and version-zero databases in one write transaction. */
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
    if (version === 1) return;
    if (version !== null && version !== 0)
      throw new Error("Unsupported database version.");
    db.exec(readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8"));
    db.exec(
      "DELETE FROM schema_version; INSERT INTO schema_version(version) VALUES (1)",
    );
  }).immediate();
}
