import { expect, it } from "vitest";
import { seedData } from "@/lib/db/seed-data";
import { testDb } from "../helpers/test-db";

it("F-71 seeds exact fixture counts and preserves the existing snapshot", () => {
  const db = testDb();
  try {
    const now = new Date("2026-11-21T19:00Z");
    expect(seedData(db, now)).toBe(true);
    const counts = db
      .prepare(
        `SELECT
      (SELECT count(*) FROM departments) departments,
      (SELECT count(*) FROM labs) labs,
      (SELECT count(*) FROM equipment) equipment,
      (SELECT count(*) FROM users) users,
      (SELECT count(*) FROM projects) projects,
      (SELECT count(*) FROM bookings) bookings,
      (SELECT count(*) FROM bookings WHERE status='no_show') no_shows`,
      )
      .get();
    expect(counts).toEqual({
      departments: 5,
      labs: 8,
      equipment: 36,
      users: 23,
      projects: 3,
      bookings: 12,
      no_shows: 2,
    });
    const conflict = db
      .prepare(
        `SELECT count(*) count, count(DISTINCT equipment_id) boards, max(start_at) start, min(end_at) end, count(DISTINCT user_id) students
      FROM bookings WHERE status='faculty_approved'`,
      )
      .get();
    expect(conflict).toEqual({
      count: 3,
      boards: 1,
      start: "2026-11-23T04:30:00.000Z",
      end: "2026-11-23T06:30:00.000Z",
      students: 3,
    });
    expect(
      db
        .prepare(
          "SELECT DISTINCT access_type FROM equipment ORDER BY access_type",
        )
        .pluck()
        .all(),
    ).toEqual(["approval", "dept_only", "open"]);
    expect(seedData(db, new Date("2027-01-01"))).toBe(false);
    expect(
      db
        .prepare("SELECT DISTINCT created_at FROM departments JOIN equipment")
        .pluck()
        .all(),
    ).toEqual([now.toISOString()]);
    expect(db.pragma("foreign_key_check")).toEqual([]);
  } finally {
    db.close();
  }
});
