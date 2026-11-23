import { expect, it } from "vitest";
import { migrate } from "@/lib/db/migrate";
import { refreshSession } from "@/lib/db/repositories/session.repo";
import { testDb } from "../helpers/test-db";

it("SEC-03/16 enforces schema constraints and refreshes only live sessions", () => {
  const db = testDb();
  try {
    migrate(db);
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(
      db
        .prepare("SELECT count(*) FROM sqlite_master WHERE type='table'")
        .pluck()
        .get(),
    ).toBe(15);
    expect(
      db
        .prepare(
          "SELECT count(*) FROM sqlite_master WHERE type='index' AND name GLOB 'idx_*'",
        )
        .pluck()
        .get(),
    ).toBe(9);
    const now = new Date("2026-01-01T09:00:00Z");
    const at = now.toISOString();
    const user = db.prepare(
      "INSERT INTO users(id,name,email,password_hash,role,status,created_at,updated_at) VALUES (?,?,?,?,?,'active',?,?)",
    );
    expect(() =>
      user.run("u", "Student", "s@example.edu", "hash", "unknown", at, at),
    ).toThrow();
    user.run("u", "Student", "s@example.edu", "hash", "student", at, at);
    const session = db.prepare("INSERT INTO sessions VALUES (?,?,?,?,?)");
    expect(() => session.run("h", "missing", at, at, at)).toThrow();
    session.run("h", "u", at, at, new Date(+now + 86400000).toISOString());
    expect(refreshSession("h", new Date(+now + 1000), db)).toEqual({
      userId: "u",
      role: "student",
    });
    expect(db.prepare("SELECT last_seen_at FROM sessions").pluck().get()).toBe(
      new Date(+now + 1000).toISOString(),
    );
    expect(refreshSession("h", new Date(+now + 7201000), db)).toBeNull();
  } finally {
    db.close();
  }
});
