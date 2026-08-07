export type ContactStatus = "lead" | "qualified" | "customer";
export type DealStage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type ActivityType = "note" | "call" | "email";

export const STAGES: DealStage[] = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
export const STAGE_LABEL: Record<DealStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost"
};
export const STATUS_LABEL: Record<ContactStatus, string> = {
  lead: "Lead",
  qualified: "Qualified",
  customer: "Customer"
};

export interface Organization {
  id: number;
  name: string;
  website: string;
  industry: string;
  notes: string;
  created_at: string;
}

export interface OrganizationRow extends Organization {
  contact_count: number;
  deal_count: number;
  open_value: number;
}

export interface OrganizationDetail extends Organization {
  contacts: Contact[];
  deals: DealRow[];
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  title: string;
  organization_id: number | null;
  status: ContactStatus;
  created_at: string;
}

export interface ContactRow extends Contact {
  organization_name: string | null;
}

export interface ContactDetail extends ContactRow {
  activities: ActivityRow[];
}

export interface Deal {
  id: number;
  name: string;
  organization_id: number | null;
  contact_id: number | null;
  stage: DealStage;
  value: number;
  probability: number;
  close_date: string | null;
  created_at: string;
}

export interface DealRow extends Deal {
  organization_name: string | null;
  contact_name: string | null;
}

export interface DealDetail extends DealRow {
  activities: ActivityRow[];
}

export interface Activity {
  id: number;
  type: ActivityType;
  contact_id: number | null;
  deal_id: number | null;
  description: string;
  occurred_at: string;
  due_date: string | null;
  done: boolean;
}

export interface ActivityRow extends Activity {
  contact_name: string | null;
  deal_name: string | null;
}

export interface DashboardData {
  kpis: {
    openCount: number;
    openValue: number;
    expectedValue: number;
    wonThisMonthCount: number;
    wonThisMonthRevenue: number;
    overdueTaskCount: number;
  };
  wonByMonth: { key: string; label: string; count: number; revenue: number }[];
  pipeline: { stage: DealStage; label: string; count: number; total: number; expected: number }[];
  recentActivities: ActivityRow[];
  tasks: ActivityRow[];
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
