import type Database from "better-sqlite3";
import { DEMO_ROLES, demoUserId } from "../auth/demo-identity";

const DEPARTMENTS = [
  ["CSE", "Computer Science"],
  ["ECE", "Electronics and Communication"],
  ["EEE", "Electrical and Electronics"],
  ["MECH", "Mechanical"],
  ["BIO", "Biotech"],
] as const;

const LABS = [
  [
    0,
    "Compute Studio",
    "computing",
    [
      "GPU Workstation A",
      "GPU Workstation B",
      "VR Development Kit",
      "Edge AI Workstation",
      "Network Test Bench",
    ],
  ],
  [
    0,
    "Embedded Studio",
    "embedded",
    [
      "ESP32-S3 Kit",
      "Arduino Uno R4",
      "Raspberry Pi 5",
      "STM32 Nucleo",
      "BLE Sensor Kit",
    ],
  ],
  [
    1,
    "Digital Design Lab",
    "electronics",
    [
      "FPGA Board A",
      "FPGA Board B",
      "Logic Analyser",
      "Mixed-Signal Oscilloscope",
      "Digital Trainer",
    ],
  ],
  [
    1,
    "RF Lab",
    "electronics",
    [
      "Spectrum Analyser",
      "RF Signal Generator",
      "Vector Network Analyser",
      "Soldering Station",
      "RF Power Meter",
    ],
  ],
  [
    2,
    "Power Electronics Lab",
    "electronics",
    [
      "DC Bench Supply",
      "Electronic Load",
      "Power Analyser",
      "Motor Drive Trainer",
    ],
  ],
  [
    2,
    "Controls Lab",
    "embedded",
    [
      "PLC Trainer",
      "Servo Control Kit",
      "Data Acquisition Kit",
      "Digital Oscilloscope",
    ],
  ],
  [
    3,
    "Fabrication Lab",
    "fabrication",
    ["FDM 3D Printer", "Resin 3D Printer", "CNC Router", "Digital Caliper Set"],
  ],
  [
    4,
    "Imaging Lab",
    "imaging",
    [
      "Stereo Microscope",
      "Compound Microscope",
      "Gel Imaging Station",
      "Digital Microscope Camera",
    ],
  ],
] as const;

function fixtureId(group: number, index: number): string {
  return `00000000-0000-4000-8000-${String(group * 1000 + index).padStart(12, "0")}`;
}

function seedPeople(db: Database.Database, at: string): void {
  const department = db.prepare("INSERT INTO departments VALUES (?,?,?)");
  DEPARTMENTS.forEach(([code, name], index) =>
    department.run(fixtureId(1, index), name, code),
  );
  const user =
    db.prepare(`INSERT INTO users(id,name,email,password_hash,role,department_id,faculty_guide_id,status,created_at,updated_at)
    VALUES (?,?,?,'!',?,?,?,'active',?,?)`);
  DEMO_ROLES.forEach((role) =>
    user.run(
      demoUserId(role),
      `Demo ${role}`,
      `demo-${role}@example.edu`,
      role,
      fixtureId(1, 1),
      null,
      at,
      at,
    ),
  );
  const faculty = ["Nila Saran", "Arun Venn", "Mira Sen", "Dev Raman"];
  const staff = ["Isha Vale", "Ravi Das", "Anya Rao"];
  const students = [
    "Asha Ray",
    "Ishan Malik",
    "Tara Mani",
    "Neel Vora",
    "Diya Dev",
    "Rohan Sen",
    "Meera Nair",
    "Kabir Shah",
    "Ria Bose",
    "Avi Rao",
    "Sara Iyer",
    "Veer Das",
  ];
  faculty.forEach((name, i) =>
    user.run(
      fixtureId(3, i),
      name,
      `faculty${i + 1}@example.edu`,
      "faculty",
      fixtureId(1, i),
      null,
      at,
      at,
    ),
  );
  staff.forEach((name, i) =>
    user.run(
      fixtureId(4, i),
      name,
      `incharge${i + 1}@example.edu`,
      "incharge",
      fixtureId(1, i),
      null,
      at,
      at,
    ),
  );
  students.forEach((name, i) =>
    user.run(
      fixtureId(5, i),
      name,
      `student${i + 1}@example.edu`,
      "student",
      fixtureId(1, i % 5),
      fixtureId(3, i % 4),
      at,
      at,
    ),
  );
}

function seedEquipment(db: Database.Database, at: string): void {
  const lab = db.prepare("INSERT INTO labs VALUES (?,?,?,?,?)");
  const equipment = db.prepare(
    `INSERT INTO equipment VALUES (?,?,?,?,?,?,'available',?,?,?,?, '09:00','18:00','[1,2,3,4,5,6]',?,?,?)`,
  );
  LABS.forEach(([department, name, category, items], index) => {
    const labId = fixtureId(6, index);
    lab.run(
      labId,
      name,
      fixtureId(1, department),
      `Block ${String.fromCharCode(65 + department)}, Room ${101 + index}`,
      index === 2 ? demoUserId("incharge") : fixtureId(4, index % 3),
    );
    items.forEach((item, i) => {
      const scarce = index === 2 && i === 0;
      const access =
        scarce || i === 0 ? "approval" : i === 3 ? "dept_only" : "open";
      const specs = {
        model: item,
        station: `${index + 1}.${i + 1}`,
        setup:
          category === "electronics"
            ? "Bench and probes provided"
            : "Use at assigned station",
      };
      equipment.run(
        fixtureId(7, index * 10 + i),
        item,
        category,
        JSON.stringify([category, ...item.toLowerCase().split(" ")]),
        JSON.stringify(specs),
        labId,
        access,
        Number(scarce || (index === 3 && i === 0)),
        120,
        14,
        `/equipment/${category}.svg`,
        at,
        at,
      );
    });
  });
}

function seedProjects(db: Database.Database, now: Date): void {
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

/** Fill an empty catalogue atomically. The clock is injectable for repeatable fixtures. */
export function seedData(db: Database.Database, now: Date): boolean {
  return db
    .transaction(() => {
      if (db.prepare("SELECT 1 FROM departments LIMIT 1").get()) return false;
      const at = now.toISOString();
      seedPeople(db, at);
      seedEquipment(db, at);
      seedProjects(db, now);
      return true;
    })
    .immediate();
}
