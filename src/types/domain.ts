export type Role = "student" | "faculty" | "incharge" | "admin";
export interface Actor {
  userId: string;
  role: Role;
}
export interface Department {
  id: string;
  name: string;
  code: string;
}
export type BookingStatus =
  | "pending_approval"
  | "changes_requested"
  | "faculty_approved"
  | "approved"
  | "checked_in"
  | "completed"
  | "rejected"
  | "cancelled"
  | "no_show"
  | "displaced";
export interface BookingWindow {
  equipmentId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
}
