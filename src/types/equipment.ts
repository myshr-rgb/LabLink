export const ACCESS_TYPES = ["open", "approval", "dept_only"] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];
export interface Equipment {
  id: string;
  name: string;
  category: string;
  lab: string;
  department: string;
  departmentCode: string;
  departmentId: string;
  location: string;
  inChargeId: string;
  tags: string[];
  specs: Record<string, string>;
  status: "available" | "maintenance" | "retired";
  accessType: AccessType;
  imagePath: string;
  requiresInchargeApproval: boolean;
  maxBookingMinutes: number;
  advanceDays: number;
  openTime: string;
  closeTime: string;
  weekdays: number[];
}

export const ACCESS_LABELS: Record<AccessType, string> = {
  open: "Open",
  approval: "Needs approval",
  dept_only: "Department only",
};
