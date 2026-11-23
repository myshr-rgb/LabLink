import { getDb } from "../src/lib/db/client";

const db = getDb();
try {
  process.stdout.write(
    "SQLite ready (schema version 1). Demo fixtures are scheduled for Phase 2.\n",
  );
} finally {
  db.close();
}
