import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";

import { config } from "../src/lib/config";

const schema = readFileSync(resolve("src/lib/db/schema.sql"), "utf8");
mkdirSync(dirname(config.DATABASE_PATH), { recursive: true });
const db = new Database(config.DATABASE_PATH);
try {
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  const initialize = db.transaction(() => {
    db.exec(schema);
    db.prepare(
      "INSERT INTO schema_version (version) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM schema_version)",
    ).run(0);
    return db.prepare("SELECT MAX(version) FROM schema_version").pluck().get();
  });
  process.stdout.write(
    `SQLite ready (schema version ${initialize.immediate()}). Demo fixtures are scheduled for Phase 2.\n`,
  );
} finally {
  db.close();
}
