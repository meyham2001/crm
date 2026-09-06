import { randomUUID } from 'crypto'
import { db } from './database'
import type { Organization, UUID } from '../types'

const selectOrg = db.prepare('SELECT * FROM organizations WHERE id = ?')
const selectAllOrgs = db.prepare('SELECT * FROM organizations ORDER BY name')
const searchOrgs = db.prepare(`
  SELECT * FROM organizations
  WHERE name LIKE ? OR website LIKE ? OR industry LIKE ?
  ORDER BY name
`)
const insertOrg = db.prepare(`
  INSERT INTO organizations (id, name, website, industry, notes)
  VALUES (?, ?, ?, ?, ?)
`)
const updateOrg = db.prepare(`
  UPDATE organizations
  SET name = ?, website = ?, industry = ?, notes = ?
  WHERE id = ?
`)
const deleteOrg = db.prepare('DELETE FROM organizations WHERE id = ?')
const countOrgs = db.prepare('SELECT COUNT(*) as count FROM organizations')
const countSearchOrgs = db.prepare(`
  SELECT COUNT(*) as count FROM organizations
  WHERE name LIKE ? OR website LIKE ? OR industry LIKE ?
`)

export const organizationRepository = {
  findAll(): Organization[] {
    return selectAllOrgs.all() as Organization[]
  },

  findById(id: UUID): Organization | undefined {
    return selectOrg.get(id) as Organization | undefined
  },

  search(query: string): Organization[] {
    const term = `%${query}%`
    return searchOrgs.all(term, term, term) as Organization[]
  },

  create(data: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Organization {
    const id = randomUUID() as UUID
    const now = new Date().toISOString()
    insertOrg.run(id, data.name, data.website, data.industry, data.notes)
    return { ...data, id, created_at: now, updated_at: now }
  },

  update(id: UUID, data: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>): Organization | undefined {
    const existing = this.findById(id)
    if (!existing) return undefined

    const updated = { ...existing, ...data }
    updateOrg.run(updated.name, updated.website, updated.industry, updated.notes, id)
    return this.findById(id)
  },

  delete(id: UUID): boolean {
    const result = deleteOrg.run(id)
    return result.changes > 0
  },

  count(): number {
    return (countOrgs.get() as { count: number }).count
  },

  countSearch(query: string): number {
    const term = `%${query}%`
    return (countSearchOrgs.get(term, term, term) as { count: number }).count
  },
}