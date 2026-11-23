import type { Equipment } from "@/types/equipment";
import { getDb } from "../client";

interface Row {
  id: string;
  name: string;
  category: string;
  lab: string;
  department: string;
  department_code: string;
  department_id: string;
  location: string;
  in_charge_id: string;
  tags: string;
  specs: string;
  status: Equipment["status"];
  access_type: Equipment["accessType"];
  image_path: string;
  requires_incharge_approval: number;
  max_booking_minutes: number;
  advance_days: number;
  open_time: string;
  close_time: string;
  weekdays: string;
}
const SELECT = `SELECT e.*, l.name lab, d.name department,d.code department_code,d.id department_id,l.location,l.in_charge_id
  FROM equipment e JOIN labs l ON l.id=e.lab_id JOIN departments d ON d.id=l.department_id`;
function map(row: Row): Equipment {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lab: row.lab,
    department: row.department,
    departmentCode: row.department_code,
    departmentId: row.department_id,
    location: row.location,
    inChargeId: row.in_charge_id,
    tags: JSON.parse(row.tags),
    specs: JSON.parse(row.specs),
    status: row.status,
    accessType: row.access_type,
    imagePath: row.image_path,
    requiresInchargeApproval: !!row.requires_incharge_approval,
    maxBookingMinutes: row.max_booking_minutes,
    advanceDays: row.advance_days,
    openTime: row.open_time,
    closeTime: row.close_time,
    weekdays: JSON.parse(row.weekdays),
  };
}

/** Read matching visible inventory using parameterized filters. */
export function findEquipmentList(filter: {
  department?: string;
  category?: string;
  accessType?: Equipment["accessType"];
}): Equipment[] {
  return getDb()
    .prepare<
      {
        department: string | null;
        category: string | null;
        access: string | null;
      },
      Row
    >(
      SELECT +
        ` WHERE e.status<>'retired' AND (@department IS NULL OR d.code=@department)
      AND (@category IS NULL OR e.category=@category) AND (@access IS NULL OR e.access_type=@access)`,
    )
    .all({
      department: filter.department ?? null,
      category: filter.category ?? null,
      access: filter.accessType ?? null,
    })
    .map(map);
}

/** Read visible equipment and its schedule. */
export function findEquipment(id: string): Equipment | undefined {
  const row = getDb()
    .prepare<[string], Row>(SELECT + " WHERE e.id=? AND e.status<>'retired'")
    .get(id);
  if (row) return map(row);
}

/** Retrieve the account's current department for department-only bookings. */
export function userDepartment(id: string): string | null {
  return (
    getDb()
      .prepare<[string], { department_id: string | null }>(
        "SELECT department_id FROM users WHERE id=? AND status='active'",
      )
      .get(id)?.department_id ?? null
  );
}
