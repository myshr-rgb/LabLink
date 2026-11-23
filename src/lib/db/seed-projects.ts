import type Database from "better-sqlite3";
import { demoUserId } from "../auth/demo-identity";
import { fixtureId } from "./fixture-id";

/** Seed a repeatable request conflict and historical utilization. */
export function seedProjects(db: Database.Database, now: Date): void {
  const at = now.toISOString();
  const day = 86_400_000;
  // 10:00 IST on the next working day, using UTC arithmetic to avoid host timezone differences.
  let slot = Math.floor((+now + 330 * 60_000) / day) * day + day + 270 * 60_000;
  if (new Date(slot).getUTCDay() === 0) slot += day;
  const iso = (time: number) => new Date(time).toISOString();
  const project = db.prepare(
    `INSERT INTO projects VALUES (?,?,?,?,?,?,?,'active',?,?)`,
  );
  const member = db.prepare("INSERT INTO project_members VALUES (?,?)");
  const booking = db.prepare(
    `INSERT INTO bookings(id,equipment_id,user_id,project_id,start_at,end_at,status,justification,conflict_group_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const board = fixtureId(7, 20);
  const group = fixtureId(10, 0);
  db.prepare(
    "INSERT INTO conflict_groups(id,equipment_id,window_start,window_end,status,created_at) VALUES (?,?,?,?,'open',?)",
  ).run(group, board, iso(slot), iso(slot + 7_200_000), at);
  const titles = [
    "Low-power sensor network",
    "Assistive motor controller",
    "Campus air monitor",
  ];
  const priorities = ["critical", "normal", "high"];
  titles.forEach((title, i) => {
    const owner = i === 0 ? demoUserId("student") : fixtureId(5, i - 1);
    const id = fixtureId(8, i);
    const guide = i === 0 ? demoUserId("faculty") : fixtureId(3, i - 1);
    project.run(
      id,
      title,
      `Prototype and validate a ${title.toLowerCase()}.`,
      owner,
      guide,
      iso(slot + [3, 12, 6][i] * day),
      priorities[i],
      at,
      at,
    );
    member.run(id, owner);
    db.prepare("INSERT INTO project_equipment VALUES (?,?)").run(id, board);
    booking.run(
      fixtureId(9, i),
      board,
      owner,
      id,
      iso(slot),
      iso(slot + 7_200_000),
      "faculty_approved",
      "Validate the hardware prototype before the project demonstration.",
      group,
      at,
      at,
    );
    db.prepare("UPDATE bookings SET incharge_approved_at=? WHERE id=?").run(
      at,
      fixtureId(9, i),
    );
    for (let j = 0; j <= i + 1; j++) {
      const start = slot - (j + i + 2) * day;
      booking.run(
        fixtureId(9, 100 + i * 10 + j),
        fixtureId(7, 21 + i),
        owner,
        id,
        iso(start),
        iso(start + 3_600_000),
        i > 0 && j === 0 ? "no_show" : "completed",
        "Prototype bench time.",
        null,
        iso(start - day),
        iso(start + 3_600_000),
      );
    }
  });
}
