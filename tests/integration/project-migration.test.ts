import { expect, it } from "vitest";
import { migrate } from "@/lib/db/migrate";
import { seedData } from "@/lib/db/seed-data";
import { testDb } from "../helpers/test-db";

it("F-30 upgrades existing projects without losing bookings or their equipment history", () => {
  const db = testDb();
  try {
    seedData(db, new Date("2026-11-23T03:00:00Z"));
    db.exec(
      "DROP TABLE project_equipment; UPDATE schema_version SET version=1",
    );
    migrate(db);
    migrate(db);
    expect(
      db.prepare("SELECT version FROM schema_version").pluck().all(),
    ).toEqual([2]);
    expect(db.prepare("SELECT count(*) FROM projects").pluck().get()).toBe(3);
    expect(db.prepare("SELECT count(*) FROM bookings").pluck().get()).toBe(12);
    expect(
      db.prepare("SELECT count(*) FROM project_equipment").pluck().get(),
    ).toBe(6);
    expect(db.pragma("foreign_key_check")).toEqual([]);
  } finally {
    db.close();
  }
});
