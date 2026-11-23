import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { openDatabase } from "@/lib/db/client";
import { seedData } from "@/lib/db/seed-data";

it("SEC-16 two SQLite connections cannot approve the same slot", async () => {
  const root = mkdtempSync(join(tmpdir(), "lablink-race-"));
  const file = join(root, "race.db");
  try {
    const setup = openDatabase(file);
    try {
      seedData(setup, new Date("2026-11-23T03:00:00Z"));
    } finally {
      setup.close();
    }
    const run = () =>
      promisify(execFile)(
        process.execPath,
        ["--import", "tsx", "tests/helpers/booking-worker.ts"],
        {
          env: { ...process.env, DATABASE_PATH: file },
          timeout: 8000,
        },
      );
    const results = await Promise.allSettled([run(), run()]);
    const output = results.map((result) => {
      if (result.status === "rejected") throw result.reason;
      return result.value.stdout;
    });
    expect(output.sort()).toEqual(["SLOT_TAKEN", "approved"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 12_000);
