import type { BookingStatus } from "./domain";
export type Priority = "normal" | "high" | "critical";
export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  guideId: string;
  guideName: string;
  deadline: string;
  priority: Priority;
  memberIds: string[];
  equipmentIds: string[];
}
export interface Booking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  userId: string;
  studentName: string;
  projectId: string | null;
  projectTitle: string | null;
  deadline: string | null;
  guideId: string | null;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  justification: string;
  decisionNote: string | null;
  inchargeApprovedAt: string | null;
  conflictGroupId: string | null;
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
