import { getDb } from "../src/lib/db/client";

const db = getDb();
try {
  const version = db
    .prepare("SELECT MAX(version) FROM schema_version")
    .pluck()
    .get();
  const count = db.prepare("SELECT count(*) FROM equipment").pluck().get();
  process.stdout.write(
    `SQLite ready (schema version ${version}, ${count} equipment items).\n`,
  );
} finally {
  db.close();
}
