export type Organization = {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  created_at: string;
};

export type OrganizationRow = Organization & {
  contact_count: number;
  deal_count: number;
  open_deal_value: number;
};

export type OrganizationInput = {
  name: string;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
};

export type Contact = {
  id: number;
  organization_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  status: string;
  created_at: string;
};

export type ContactRow = Contact & {
  organization_name?: string | null;
  deal_count?: number;
  open_deal_value?: number;
};

export type ContactInput = {
  organization_id?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  status?: string;
};

export type Deal = {
  id: number;
  organization_id: number;
  contact_id: number | null;
  name: string;
  stage: string;
  value: number;
  probability: number;
  close_date: string | null;
  created_at: string;
};

export type DealRow = Deal & {
  organization_name?: string;
  contact_name?: string | null;
  expected_value?: number;
};

export type DealInput = {
  organization_id: number;
  contact_id?: number | null;
  name: string;
  stage?: string;
  value?: number;
  probability?: number;
  close_date?: string | null;
};

export type Activity = {
  id: number;
  contact_id: number | null;
  deal_id: number | null;
  type: string;
  description: string;
  happened_at: string;
  due_date: string | null;
  done: number;
  created_at: string;
};

export type ActivityRow = Activity & {
  contact_name?: string | null;
  deal_name?: string | null;
  organization_name?: string | null;
  overdue?: number;
};

export type ActivityInput = {
  contact_id?: number | null;
  deal_id?: number | null;
  type?: string;
  description: string;
  happened_at?: string;
  due_date?: string | null;
  done?: boolean;
};

export type MonthPoint = {
  month: string;
  label: string;
  count: number;
  revenue: number;
};

export type PipelinePoint = {
  stage: string;
  count: number;
  value: number;
  expected: number;
};

export type DashboardStats = {
  openValue: number;
  openExpected: number;
  openCount: number;
  wonCount: number;
  wonValue: number;
  wonThisMonthCount: number;
  wonThisMonthValue: number;
  taskDueCount: number;
  wonByMonth: MonthPoint[];
  pipeline: PipelinePoint[];
  recent: ActivityRow[];
  tasks: ActivityRow[];
};