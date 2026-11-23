import { getDb } from "../src/lib/db/client";

const db = getDb();
try {
  const count = db.prepare("SELECT count(*) FROM equipment").pluck().get();
  process.stdout.write(
    `SQLite ready (schema version 1, ${count} equipment items).\n`,
  );
} finally {
  db.close();
}
