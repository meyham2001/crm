import { randomUUID } from 'crypto'
import { db } from './database'
import type { Activity, UUID } from '../types'

const selectActivity = db.prepare('SELECT * FROM activities WHERE id = ?')
const selectAllActivities = db.prepare('SELECT * FROM activities ORDER BY occurred_at DESC')
const selectActivitiesByContact = db.prepare('SELECT * FROM activities WHERE contact_id = ? ORDER BY occurred_at DESC')
const selectActivitiesByDeal = db.prepare('SELECT * FROM activities WHERE deal_id = ? ORDER BY occurred_at DESC')
const selectRecentActivities = db.prepare(`
  SELECT a.*, c.name as contact_name, d.name as deal_name, o.name as organization_name
  FROM activities a
  LEFT JOIN contacts c ON a.contact_id = c.id
  LEFT JOIN deals d ON a.deal_id = d.id
  LEFT JOIN organizations o ON d.organization_id = o.id
  ORDER BY a.occurred_at DESC
  LIMIT ?
`)
const selectUpcomingTasks = db.prepare(`
  SELECT a.*, c.name as contact_name, d.name as deal_name
  FROM activities a
  LEFT JOIN contacts c ON a.contact_id = c.id
  LEFT JOIN deals d ON a.deal_id = d.id
  WHERE a.due_date IS NOT NULL AND a.done = 0 AND date(a.due_date) >= date('now')
  ORDER BY a.due_date ASC
`)
const selectOverdueTasks = db.prepare(`
  SELECT a.*, c.name as contact_name, d.name as deal_name
  FROM activities a
  LEFT JOIN contacts c ON a.contact_id = c.id
  LEFT JOIN deals d ON a.deal_id = d.id
  WHERE a.due_date IS NOT NULL AND a.done = 0 AND date(a.due_date) < date('now')
  ORDER BY a.due_date ASC
`)
const insertActivity = db.prepare(`
  INSERT INTO activities (id, contact_id, deal_id, type, description, occurred_at, due_date, done)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
const updateActivity = db.prepare(`
  UPDATE activities
  SET contact_id = ?, deal_id = ?, type = ?, description = ?, occurred_at = ?, due_date = ?, done = ?
  WHERE id = ?
`)
const updateActivityDone = db.prepare('UPDATE activities SET done = ? WHERE id = ?')
const deleteActivity = db.prepare('DELETE FROM activities WHERE id = ?')
const countActivities = db.prepare('SELECT COUNT(*) as count FROM activities')

export const activityRepository = {
  findAll(): Activity[] {
    return selectAllActivities.all() as Activity[]
  },

  findById(id: UUID): Activity | undefined {
    return selectActivity.get(id) as Activity | undefined
  },

  findByContact(contactId: UUID): Activity[] {
    return selectActivitiesByContact.all(contactId) as Activity[]
  },

  findByDeal(dealId: UUID): Activity[] {
    return selectActivitiesByDeal.all(dealId) as Activity[]
  },

  getRecent(limit: number = 10): (Activity & { contact_name?: string; deal_name?: string; organization_name?: string })[] {
    return selectRecentActivities.all(limit) as (Activity & { contact_name?: string; deal_name?: string; organization_name?: string })[]
  },

  getUpcomingTasks(): (Activity & { contact_name?: string; deal_name?: string })[] {
    return selectUpcomingTasks.all() as (Activity & { contact_name?: string; deal_name?: string })[]
  },

  getOverdueTasks(): (Activity & { contact_name?: string; deal_name?: string })[] {
    return selectOverdueTasks.all() as (Activity & { contact_name?: string; deal_name?: string })[]
  },

  create(data: Omit<Activity, 'id' | 'created_at' | 'updated_at'>): Activity {
    const id = randomUUID() as UUID
    const now = new Date().toISOString()
    insertActivity.run(
      id,
      data.contact_id,
      data.deal_id,
      data.type,
      data.description,
      data.occurred_at,
      data.due_date,
      data.done ? 1 : 0
    )
    return { ...data, id, created_at: now, updated_at: now }
  },

  update(id: UUID, data: Partial<Omit<Activity, 'id' | 'created_at' | 'updated_at'>>): Activity | undefined {
    const existing = this.findById(id)
    if (!existing) return undefined

    const updated = { ...existing, ...data }
    updateActivity.run(
      updated.contact_id,
      updated.deal_id,
      updated.type,
      updated.description,
      updated.occurred_at,
      updated.due_date,
      updated.done ? 1 : 0,
      id
    )
    return this.findById(id)
  },

  toggleDone(id: UUID): Activity | undefined {
    const existing = this.findById(id)
    if (!existing) return undefined

    const done = existing.done ? 0 : 1
    updateActivityDone.run(done, id)
    return this.findById(id)
  },

  delete(id: UUID): boolean {
    const result = deleteActivity.run(id)
    return result.changes > 0
  },

  count(): number {
    return (countActivities.get() as { count: number }).count
  },
}