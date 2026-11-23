import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { expect, it } from "vitest";

it("F-71 initializes the scaffold twice without duplicating its version row", () => {
  const directory = mkdtempSync(join(tmpdir(), "lablink-seed-"));
  const path = join(directory, "test.db");
  try {
    const legacy = new Database(path);
    legacy.exec(
      "CREATE TABLE schema_version (version INTEGER PRIMARY KEY CHECK(version >= 0)); INSERT INTO schema_version VALUES (0)",
    );
    legacy.close();
    for (let run = 0; run < 2; run++) {
      execFileSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], {
        env: { ...process.env, DATABASE_PATH: path },
      });
    }
    const db = new Database(path, { readonly: true });
    try {
      expect(
        db.prepare("SELECT version FROM schema_version").pluck().all(),
      ).toEqual([1]);
      expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
    } finally {
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
