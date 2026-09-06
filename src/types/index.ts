export type UUID = string

export function uuid(): UUID {
  return crypto.randomUUID()
}

export interface Organization {
  id: UUID
  name: string
  website: string | null
  industry: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: UUID
  organization_id: UUID | null
  name: string
  email: string | null
  phone: string | null
  job_title: string | null
  status: ContactStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type ContactStatus = 'lead' | 'qualified' | 'customer'

export interface Deal {
  id: UUID
  organization_id: UUID
  contact_id: UUID | null
  name: string
  stage: DealStage
  value: number
  probability: number
  close_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export const DEAL_STAGES: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  new: 'gray',
  qualified: 'blue',
  proposal: 'purple',
  negotiation: 'amber',
  won: 'green',
  lost: 'red',
}

export interface Activity {
  id: UUID
  contact_id: UUID | null
  deal_id: UUID | null
  type: ActivityType
  description: string
  occurred_at: string
  due_date: string | null
  done: boolean
  created_at: string
  updated_at: string
}

export type ActivityType = 'note' | 'call' | 'email'

export const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'email']

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
}

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  note: 'FileText',
  call: 'Phone',
  email: 'Mail',
}

export interface DashboardStats {
  dealsWonPerMonth: { month: string; count: number }[]
  revenueWonPerMonth: { month: string; revenue: number }[]
  pipelineByStage: { stage: DealStage; count: number; totalValue: number; expectedRevenue: number }[]
  recentActivities: (Activity & { contact_name?: string; deal_name?: string; organization_name?: string })[]
  upcomingTasks: (Activity & { contact_name?: string; deal_name?: string })[]
  overdueTasks: (Activity & { contact_name?: string; deal_name?: string })[]
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

export interface SearchParams {
  query?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ContactSearchParams extends SearchParams {
  status?: ContactStatus
}