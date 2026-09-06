import { db } from './database'
import type { DealStage } from '../types'

const getDealsWonPerMonth = db.prepare(`
  SELECT strftime('%Y-%m', close_date) as month, COUNT(*) as count
  FROM deals
  WHERE stage = 'won' AND close_date IS NOT NULL
  GROUP BY strftime('%Y-%m', close_date)
  ORDER BY month
`)

const getRevenueWonPerMonth = db.prepare(`
  SELECT strftime('%Y-%m', close_date) as month, SUM(value) as revenue
  FROM deals
  WHERE stage = 'won' AND close_date IS NOT NULL
  GROUP BY strftime('%Y-%m', close_date)
  ORDER BY month
`)

const getPipelineStats = db.prepare(`
  SELECT stage, COUNT(*) as count, SUM(value) as totalValue, SUM(value * probability / 100) as expectedRevenue
  FROM deals
  GROUP BY stage
`)

const getRecentActivitiesWithDetails = db.prepare(`
  SELECT a.*, c.name as contact_name, d.name as deal_name, o.name as organization_name
  FROM activities a
  LEFT JOIN contacts c ON a.contact_id = c.id
  LEFT JOIN deals d ON a.deal_id = d.id
  LEFT JOIN organizations o ON d.organization_id = o.id
  ORDER BY a.occurred_at DESC
  LIMIT 20
`)

const getUpcomingTasksWithDetails = db.prepare(`
  SELECT a.*, c.name as contact_name, d.name as deal_name
  FROM activities a
  LEFT JOIN contacts c ON a.contact_id = c.id
  LEFT JOIN deals d ON a.deal_id = d.id
  WHERE a.due_date IS NOT NULL AND a.done = 0 AND date(a.due_date) >= date('now')
  ORDER BY a.due_date ASC
  LIMIT 10
`)

const getOverdueTasksWithDetails = db.prepare(`
  SELECT a.*, c.name as contact_name, d.name as deal_name
  FROM activities a
  LEFT JOIN contacts c ON a.contact_id = c.id
  LEFT JOIN deals d ON a.deal_id = d.id
  WHERE a.due_date IS NOT NULL AND a.done = 0 AND date(a.due_date) < date('now')
  ORDER BY a.due_date ASC
  LIMIT 10
`)

export const dashboardRepository = {
  getDealsWonPerMonth(): { month: string; count: number }[] {
    return getDealsWonPerMonth.all() as { month: string; count: number }[]
  },

  getRevenueWonPerMonth(): { month: string; revenue: number }[] {
    return getRevenueWonPerMonth.all() as { month: string; revenue: number }[]
  },

  getPipelineStats(): { stage: DealStage; count: number; totalValue: number; expectedRevenue: number }[] {
    const results = getPipelineStats.all() as { stage: DealStage; count: number; totalValue: number; expectedRevenue: number }[]
    const stages: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    const map = new Map(results.map(r => [r.stage, r]))
    return stages.map(stage => map.get(stage) || { stage, count: 0, totalValue: 0, expectedRevenue: 0 })
  },

  getRecentActivities(): (import('../types').Activity & { contact_name?: string; deal_name?: string; organization_name?: string })[] {
    return getRecentActivitiesWithDetails.all() as (import('../types').Activity & { contact_name?: string; deal_name?: string; organization_name?: string })[]
  },

  getUpcomingTasks(): (import('../types').Activity & { contact_name?: string; deal_name?: string })[] {
    return getUpcomingTasksWithDetails.all() as (import('../types').Activity & { contact_name?: string; deal_name?: string })[]
  },

  getOverdueTasks(): (import('../types').Activity & { contact_name?: string; deal_name?: string })[] {
    return getOverdueTasksWithDetails.all() as (import('../types').Activity & { contact_name?: string; deal_name?: string })[]
  },
}