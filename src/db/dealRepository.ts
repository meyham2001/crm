import { randomUUID } from 'crypto'
import { db } from './database'
import type { Deal, UUID, DealStage } from '../types'

const selectDeal = db.prepare('SELECT * FROM deals WHERE id = ?')
const selectAllDeals = db.prepare('SELECT * FROM deals ORDER BY created_at DESC')
const selectDealsByOrg = db.prepare('SELECT * FROM deals WHERE organization_id = ? ORDER BY created_at DESC')
const selectDealsByStage = db.prepare('SELECT * FROM deals WHERE stage = ? ORDER BY created_at DESC')
const searchDeals = db.prepare(`
  SELECT * FROM deals
  WHERE name LIKE ? OR notes LIKE ?
  ORDER BY created_at DESC
`)
const insertDeal = db.prepare(`
  INSERT INTO deals (id, organization_id, contact_id, name, stage, value, probability, close_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const updateDeal = db.prepare(`
  UPDATE deals
  SET organization_id = ?, contact_id = ?, name = ?, stage = ?, value = ?, probability = ?, close_date = ?, notes = ?
  WHERE id = ?
`)
const updateDealStage = db.prepare('UPDATE deals SET stage = ? WHERE id = ?')
const deleteDeal = db.prepare('DELETE FROM deals WHERE id = ?')
const countDeals = db.prepare('SELECT COUNT(*) as count FROM deals')
const countDealsByStage = db.prepare('SELECT COUNT(*) as count FROM deals WHERE stage = ?')
const countSearchDeals = db.prepare(`
  SELECT COUNT(*) as count FROM deals
  WHERE name LIKE ? OR notes LIKE ?
`)
const getDealsByStageForPipeline = db.prepare(`
  SELECT * FROM deals WHERE stage = ? ORDER BY probability DESC, value DESC
`)

export const dealRepository = {
  findAll(): Deal[] {
    return selectAllDeals.all() as Deal[]
  },

  findById(id: UUID): Deal | undefined {
    return selectDeal.get(id) as Deal | undefined
  },

  findByOrganization(organizationId: UUID): Deal[] {
    return selectDealsByOrg.all(organizationId) as Deal[]
  },

  findByStage(stage: DealStage): Deal[] {
    return selectDealsByStage.all(stage) as Deal[]
  },

  findAllByStage(): Record<string, Deal[]> {
    const stages: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    const result: Record<string, Deal[]> = {}
    for (const stage of stages) {
      result[stage] = this.findByStage(stage)
    }
    return result
  },

  search(query: string): Deal[] {
    const term = `%${query}%`
    return searchDeals.all(term, term) as Deal[]
  },

  create(data: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Deal {
    const id = randomUUID() as UUID
    const now = new Date().toISOString()
    insertDeal.run(
      id,
      data.organization_id,
      data.contact_id,
      data.name,
      data.stage,
      data.value,
      data.probability,
      data.close_date,
      data.notes
    )
    return { ...data, id, created_at: now, updated_at: now }
  },

  update(id: UUID, data: Partial<Omit<Deal, 'id' | 'created_at' | 'updated_at'>>): Deal | undefined {
    const existing = this.findById(id)
    if (!existing) return undefined

    const updated = { ...existing, ...data }
    updateDeal.run(
      updated.organization_id,
      updated.contact_id,
      updated.name,
      updated.stage,
      updated.value,
      updated.probability,
      updated.close_date,
      updated.notes,
      id
    )
    return this.findById(id)
  },

  updateStage(id: UUID, stage: DealStage): Deal | undefined {
    const existing = this.findById(id)
    if (!existing) return undefined

    updateDealStage.run(stage, id)
    return this.findById(id)
  },

  delete(id: UUID): boolean {
    const result = deleteDeal.run(id)
    return result.changes > 0
  },

  count(): number {
    return (countDeals.get() as { count: number }).count
  },

  countByStage(stage: DealStage): number {
    return (countDealsByStage.get(stage) as { count: number }).count
  },

  countSearch(query: string): number {
    const term = `%${query}%`
    return (countSearchDeals.get(term, term) as { count: number }).count
  },

  getPipelineData(): Record<DealStage, Deal[]> {
    const stages: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    const result: Record<DealStage, Deal[]> = {} as Record<DealStage, Deal[]>
    for (const stage of stages) {
      result[stage] = getDealsByStageForPipeline.all(stage) as Deal[]
    }
    return result
  },
}