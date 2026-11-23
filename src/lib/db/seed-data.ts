import type Database from "better-sqlite3";
import { DEMO_ROLES, demoUserId } from "../auth/demo-identity";
import { fixtureId } from "./fixture-id";
import { seedProjects } from "./seed-projects";

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
