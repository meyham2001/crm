import { randomUUID } from 'crypto'
import { db } from './database'
import type { Contact, UUID, ContactStatus } from '../types'

const selectContact = db.prepare('SELECT * FROM contacts WHERE id = ?')
const selectAllContacts = db.prepare('SELECT * FROM contacts ORDER BY name')
const selectContactsByOrg = db.prepare('SELECT * FROM contacts WHERE organization_id = ? ORDER BY name')
const selectContactsByStatus = db.prepare('SELECT * FROM contacts WHERE status = ? ORDER BY name')
const searchContacts = db.prepare(`
  SELECT * FROM contacts
  WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR job_title LIKE ?
  ORDER BY name
`)
const searchContactsByStatus = db.prepare(`
  SELECT * FROM contacts
  WHERE status = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR job_title LIKE ?)
  ORDER BY name
`)
const insertContact = db.prepare(`
  INSERT INTO contacts (id, organization_id, name, email, phone, job_title, status, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
const updateContact = db.prepare(`
  UPDATE contacts
  SET organization_id = ?, name = ?, email = ?, phone = ?, job_title = ?, status = ?, notes = ?
  WHERE id = ?
`)
const deleteContact = db.prepare('DELETE FROM contacts WHERE id = ?')
const countContacts = db.prepare('SELECT COUNT(*) as count FROM contacts')
const countContactsByStatus = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE status = ?')
const countSearchContacts = db.prepare(`
  SELECT COUNT(*) as count FROM contacts
  WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR job_title LIKE ?
`)
const countSearchContactsByStatus = db.prepare(`
  SELECT COUNT(*) as count FROM contacts
  WHERE status = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR job_title LIKE ?)
`)

export const contactRepository = {
  findAll(): Contact[] {
    return selectAllContacts.all() as Contact[]
  },

  findById(id: UUID): Contact | undefined {
    return selectContact.get(id) as Contact | undefined
  },

  findByOrganization(organizationId: UUID): Contact[] {
    return selectContactsByOrg.all(organizationId) as Contact[]
  },

  findByStatus(status: ContactStatus): Contact[] {
    return selectContactsByStatus.all(status) as Contact[]
  },

  search(query: string, status?: ContactStatus): Contact[] {
    const term = `%${query}%`
    if (status) {
      return searchContactsByStatus.all(status, term, term, term, term) as Contact[]
    }
    return searchContacts.all(term, term, term, term) as Contact[]
  },

  create(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact {
    const id = randomUUID() as UUID
    const now = new Date().toISOString()
    insertContact.run(
      id,
      data.organization_id,
      data.name,
      data.email,
      data.phone,
      data.job_title,
      data.status,
      data.notes
    )
    return { ...data, id, created_at: now, updated_at: now }
  },

  update(id: UUID, data: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>): Contact | undefined {
    const existing = this.findById(id)
    if (!existing) return undefined

    const updated = { ...existing, ...data }
    updateContact.run(
      updated.organization_id,
      updated.name,
      updated.email,
      updated.phone,
      updated.job_title,
      updated.status,
      updated.notes,
      id
    )
    return this.findById(id)
  },

  delete(id: UUID): boolean {
    const result = deleteContact.run(id)
    return result.changes > 0
  },

  count(): number {
    return (countContacts.get() as { count: number }).count
  },

  countByStatus(status: ContactStatus): number {
    return (countContactsByStatus.get(status) as { count: number }).count
  },

  countSearch(query: string, status?: ContactStatus): number {
    const term = `%${query}%`
    if (status) {
      return (countSearchContactsByStatus.get(status, term, term, term, term) as { count: number }).count
    }
    return (countSearchContacts.get(term, term, term, term) as { count: number }).count
  },
}