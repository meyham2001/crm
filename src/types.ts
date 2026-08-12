export const STAGES = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const
export type Stage = typeof STAGES[number]
export type ContactStatus = 'lead' | 'qualified' | 'customer'
export type ActivityType = 'note' | 'call' | 'email'

export type Organization = {
  id: number
  name: string
  website: string
  industry: string
  notes: string
  createdAt: string
  contactCount?: number
  dealCount?: number
}
export type Contact = {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  title: string
  status: ContactStatus
  organizationId: number | null
  organizationName?: string | null
  createdAt: string
}
export type Deal = {
  id: number
  name: string
  organizationId: number | null
  organizationName?: string | null
  contactId: number | null
  contactName?: string | null
  stage: Stage
  value: number
  probability: number
  closeDate: string
  createdAt: string
}
export type Activity = {
  id: number
  type: ActivityType
  contactId: number | null
  contactName?: string | null
  dealId: number | null
  dealName?: string | null
  description: string
  occurredAt: string
  dueDate: string | null
  done: boolean
}
export type Bootstrap = { organizations: Organization[]; contacts: Contact[]; deals: Deal[]; activities: Activity[] }
export type DetailOrganization = Organization & { contacts: Contact[]; deals: Deal[] }
export type DetailContact = Contact & { activities: Activity[]; deals: Deal[] }
export type DetailDeal = Deal & { activities: Activity[] }
