import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type Stage = 'New' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
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

type Row = Record<string, unknown>

const today = () => new Date()
const isoDate = (daysFromToday: number) => {
  const value = today()
  value.setDate(value.getDate() + daysFromToday)
  return value.toISOString().slice(0, 10)
}
const isoDateTime = (daysFromToday: number, hour = 10) => {
  const value = today()
  value.setDate(value.getDate() + daysFromToday)
  value.setHours(hour, 0, 0, 0)
  return value.toISOString()
}
const monthDate = (monthsAgo: number, day: number) => {
  const value = today()
  value.setMonth(value.getMonth() - monthsAgo, day)
  return value.toISOString().slice(0, 10)
}

export function initDatabase(fileName = process.env.DB_FILE || path.join(process.cwd(), 'data', 'crm.sqlite')) {
  if (fileName !== ':memory:') fs.mkdirSync(path.dirname(fileName), { recursive: true })
  const db = new Database(fileName)
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      website TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('lead', 'qualified', 'customer')),
      organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      stage TEXT NOT NULL CHECK(stage IN ('New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
      value REAL NOT NULL DEFAULT 0,
      probability INTEGER NOT NULL DEFAULT 50,
      close_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('note', 'call', 'email')),
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      due_date TEXT,
      done INTEGER NOT NULL DEFAULT 0
    );
  `)
  if ((db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number }).count === 0) seedDatabase(db)
  return db
}

function seedDatabase(db: Database.Database) {
  const now = new Date().toISOString()
  const addOrganization = db.prepare('INSERT INTO organizations (name, website, industry, notes, created_at) VALUES (?, ?, ?, ?, ?)')
  const organizations = [
    ['Northstar Labs', 'northstarlabs.com', 'SaaS', 'Fast-moving product team focused on developer tools.', now],
    ['Meridian Health', 'meridianhealth.co', 'Healthcare', 'Regional healthcare network modernizing patient operations.', now],
    ['Brightline Retail', 'brightlineretail.com', 'Retail', 'Omnichannel retailer with 42 storefronts across the US.', now],
    ['Atlas Financial', 'atlasfinancial.io', 'Fintech', 'Digital-first commercial lending platform.', now],
    ['Cedar & Co.', 'cedarandco.com', 'Professional services', 'Boutique consultancy expanding its client delivery team.', now],
  ]
  const organizationIds = organizations.map((organization) => Number(addOrganization.run(...organization).lastInsertRowid))

  const addContact = db.prepare('INSERT INTO contacts (first_name, last_name, email, phone, title, status, organization_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const contacts = [
    ['Maya', 'Chen', 'maya.chen@northstarlabs.com', '(415) 555-0198', 'VP Product', 'customer', organizationIds[0], now],
    ['Jonah', 'Brooks', 'jonah.brooks@northstarlabs.com', '(415) 555-0142', 'Head of Engineering', 'qualified', organizationIds[0], now],
    ['Priya', 'Nair', 'priya.nair@meridianhealth.co', '(312) 555-0186', 'Director of Operations', 'qualified', organizationIds[1], now],
    ['Elena', 'Rossi', 'elena.rossi@brightlineretail.com', '(646) 555-0107', 'Chief Marketing Officer', 'lead', organizationIds[2], now],
    ['Marcus', 'Lee', 'marcus.lee@atlasfinancial.io', '(212) 555-0129', 'Revenue Operations Lead', 'customer', organizationIds[3], now],
    ['Sofia', 'Martinez', 'sofia@cedarandco.com', '(617) 555-0164', 'Managing Partner', 'lead', organizationIds[4], now],
    ['Theo', 'Grant', 'theo.grant@brightlineretail.com', '(646) 555-0133', 'Director of Digital', 'qualified', organizationIds[2], now],
  ]
  const contactIds = contacts.map((contact) => Number(addContact.run(...contact).lastInsertRowid))

  const addDeal = db.prepare('INSERT INTO deals (name, organization_id, contact_id, stage, value, probability, close_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const deals = [
    ['Platform expansion', organizationIds[0], contactIds[0], 'Won', 82000, 100, monthDate(2, 14), now],
    ['Analytics workspace', organizationIds[0], contactIds[1], 'Proposal', 54000, 70, isoDate(18), now],
    ['Care operations rollout', organizationIds[1], contactIds[2], 'Negotiation', 126000, 80, isoDate(31), now],
    ['Store intelligence pilot', organizationIds[2], contactIds[3], 'Qualified', 68000, 55, isoDate(45), now],
    ['Revenue command center', organizationIds[3], contactIds[4], 'Won', 98000, 100, monthDate(1, 22), now],
    ['Partner enablement', organizationIds[4], contactIds[5], 'New', 35000, 25, isoDate(62), now],
    ['Digital loyalty refresh', organizationIds[2], contactIds[6], 'Proposal', 76000, 65, isoDate(26), now],
    ['Commercial lending portal', organizationIds[3], contactIds[4], 'Lost', 112000, 0, monthDate(3, 8), now],
  ]
  const dealIds = deals.map((deal) => Number(addDeal.run(...deal).lastInsertRowid))

  const addActivity = db.prepare('INSERT INTO activities (type, contact_id, deal_id, description, occurred_at, due_date, done) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const activities = [
    ['call', contactIds[0], dealIds[0], 'Renewal review completed. Maya confirmed the rollout is on track.', isoDateTime(-1, 14), null, 1],
    ['email', contactIds[2], dealIds[2], 'Shared the implementation brief and security overview for review.', isoDateTime(-2, 11), isoDate(5), 0],
    ['note', contactIds[4], dealIds[4], 'Marcus introduced the new RevOps analyst who will own reporting.', isoDateTime(-3, 9), null, 0],
    ['call', contactIds[3], dealIds[3], 'Discovery call: loyalty and customer data are the first priorities.', isoDateTime(-5, 16), isoDate(2), 0],
    ['email', contactIds[5], dealIds[5], 'Sent a concise partnership proposal and sample engagement plan.', isoDateTime(-7, 10), isoDate(-1), 0],
    ['note', contactIds[1], dealIds[1], 'Technical validation is complete; proposal is with procurement.', isoDateTime(-9, 13), null, 1],
    ['call', contactIds[6], dealIds[6], 'Follow-up scheduled to align on pilot success metrics.', isoDateTime(-12, 15), isoDate(9), 0],
    ['email', contactIds[0], dealIds[0], 'Welcome note sent after the platform expansion was signed.', monthDate(2, 15) + 'T09:00:00.000Z', null, 1],
  ]
  activities.forEach((activity) => addActivity.run(...activity))
}

const orgSelect = `
  SELECT o.*, COUNT(DISTINCT c.id) AS contact_count, COUNT(DISTINCT d.id) AS deal_count
  FROM organizations o
  LEFT JOIN contacts c ON c.organization_id = o.id
  LEFT JOIN deals d ON d.organization_id = o.id
`

const mapOrganization = (row: Row): Organization => ({
  id: Number(row.id), name: String(row.name), website: String(row.website), industry: String(row.industry), notes: String(row.notes),
  createdAt: String(row.created_at), contactCount: Number(row.contact_count ?? 0), dealCount: Number(row.deal_count ?? 0),
})
const mapContact = (row: Row): Contact => ({
  id: Number(row.id), firstName: String(row.first_name), lastName: String(row.last_name), email: String(row.email), phone: String(row.phone),
  title: String(row.title), status: row.status as ContactStatus, organizationId: row.organization_id == null ? null : Number(row.organization_id),
  organizationName: row.organization_name == null ? null : String(row.organization_name), createdAt: String(row.created_at),
})
const mapDeal = (row: Row): Deal => ({
  id: Number(row.id), name: String(row.name), organizationId: row.organization_id == null ? null : Number(row.organization_id),
  organizationName: row.organization_name == null ? null : String(row.organization_name), contactId: row.contact_id == null ? null : Number(row.contact_id),
  contactName: row.contact_name == null ? null : String(row.contact_name), stage: row.stage as Stage, value: Number(row.value), probability: Number(row.probability),
  closeDate: String(row.close_date), createdAt: String(row.created_at),
})
const mapActivity = (row: Row): Activity => ({
  id: Number(row.id), type: row.type as ActivityType, contactId: row.contact_id == null ? null : Number(row.contact_id),
  contactName: row.contact_name == null ? null : String(row.contact_name), dealId: row.deal_id == null ? null : Number(row.deal_id),
  dealName: row.deal_name == null ? null : String(row.deal_name), description: String(row.description), occurredAt: String(row.occurred_at),
  dueDate: row.due_date == null ? null : String(row.due_date), done: Boolean(row.done),
})

export function listOrganizations(db: Database.Database, search = '') {
  const query = `${orgSelect} WHERE (? = '' OR lower(o.name) LIKE lower(?) OR lower(o.industry) LIKE lower(?)) GROUP BY o.id ORDER BY o.name`
  const term = `%${search}%`
  return (db.prepare(query).all(search, term, term) as Row[]).map(mapOrganization)
}

export function getOrganization(db: Database.Database, id: number) {
  const organization = db.prepare(`${orgSelect} WHERE o.id = ? GROUP BY o.id`).get(id)
  if (!organization) return null
  return {
    ...mapOrganization(organization as Row),
    contacts: (db.prepare('SELECT c.*, o.name AS organization_name FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id WHERE c.organization_id = ? ORDER BY c.first_name, c.last_name').all(id) as Row[]).map(mapContact),
    deals: listDealsForOrganization(db, id),
  }
}

function listDealsForOrganization(db: Database.Database, id: number) {
  return (db.prepare(`SELECT d.*, o.name AS organization_name, trim(c.first_name || ' ' || c.last_name) AS contact_name FROM deals d LEFT JOIN organizations o ON o.id = d.organization_id LEFT JOIN contacts c ON c.id = d.contact_id WHERE d.organization_id = ? ORDER BY d.close_date`).all(id) as Row[]).map(mapDeal)
}

export function createOrganization(db: Database.Database, input: Omit<Organization, 'id' | 'createdAt' | 'contactCount' | 'dealCount'>) {
  const result = db.prepare('INSERT INTO organizations (name, website, industry, notes, created_at) VALUES (?, ?, ?, ?, ?)').run(input.name.trim(), input.website?.trim() || '', input.industry?.trim() || '', input.notes?.trim() || '', new Date().toISOString())
  return getOrganization(db, Number(result.lastInsertRowid))
}

export function updateOrganization(db: Database.Database, id: number, input: Omit<Organization, 'id' | 'createdAt' | 'contactCount' | 'dealCount'>) {
  db.prepare('UPDATE organizations SET name = ?, website = ?, industry = ?, notes = ? WHERE id = ?').run(input.name.trim(), input.website?.trim() || '', input.industry?.trim() || '', input.notes?.trim() || '', id)
  return getOrganization(db, id)
}

export function deleteOrganization(db: Database.Database, id: number) { return db.prepare('DELETE FROM organizations WHERE id = ?').run(id).changes > 0 }

export function listContacts(db: Database.Database, search = '', status = '') {
  const query = `SELECT c.*, o.name AS organization_name FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id WHERE (? = '' OR lower(c.first_name || ' ' || c.last_name) LIKE lower(?) OR lower(c.email) LIKE lower(?) OR lower(c.title) LIKE lower(?)) AND (? = '' OR c.status = ?) ORDER BY c.first_name, c.last_name`
  const term = `%${search}%`
  return (db.prepare(query).all(search, term, term, term, status, status) as Row[]).map(mapContact)
}

export function getContact(db: Database.Database, id: number) {
  const contact = db.prepare('SELECT c.*, o.name AS organization_name FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id WHERE c.id = ?').get(id)
  if (!contact) return null
  return { ...mapContact(contact as Row), activities: listActivities(db, { contactId: id }), deals: listDealsForContact(db, id) }
}

function listDealsForContact(db: Database.Database, id: number) {
  return (db.prepare(`SELECT d.*, o.name AS organization_name, trim(c.first_name || ' ' || c.last_name) AS contact_name FROM deals d LEFT JOIN organizations o ON o.id = d.organization_id LEFT JOIN contacts c ON c.id = d.contact_id WHERE d.contact_id = ? ORDER BY d.close_date`).all(id) as Row[]).map(mapDeal)
}

export function createContact(db: Database.Database, input: Omit<Contact, 'id' | 'createdAt' | 'organizationName'>) {
  const result = db.prepare('INSERT INTO contacts (first_name, last_name, email, phone, title, status, organization_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(input.firstName.trim(), input.lastName.trim(), input.email.trim(), input.phone?.trim() || '', input.title?.trim() || '', input.status, input.organizationId || null, new Date().toISOString())
  return getContact(db, Number(result.lastInsertRowid))
}

export function updateContact(db: Database.Database, id: number, input: Omit<Contact, 'id' | 'createdAt' | 'organizationName'>) {
  db.prepare('UPDATE contacts SET first_name = ?, last_name = ?, email = ?, phone = ?, title = ?, status = ?, organization_id = ? WHERE id = ?').run(input.firstName.trim(), input.lastName.trim(), input.email.trim(), input.phone?.trim() || '', input.title?.trim() || '', input.status, input.organizationId || null, id)
  return getContact(db, id)
}

export function deleteContact(db: Database.Database, id: number) { return db.prepare('DELETE FROM contacts WHERE id = ?').run(id).changes > 0 }

export function listDeals(db: Database.Database, search = '') {
  const query = `SELECT d.*, o.name AS organization_name, trim(c.first_name || ' ' || c.last_name) AS contact_name FROM deals d LEFT JOIN organizations o ON o.id = d.organization_id LEFT JOIN contacts c ON c.id = d.contact_id WHERE (? = '' OR lower(d.name) LIKE lower(?) OR lower(o.name) LIKE lower(?) OR lower(c.first_name || ' ' || c.last_name) LIKE lower(?) OR lower(d.stage) LIKE lower(?)) ORDER BY CASE d.stage WHEN 'Won' THEN 5 WHEN 'Lost' THEN 6 ELSE 1 END, d.close_date`
  const term = `%${search}%`
  return (db.prepare(query).all(search, term, term, term, term) as Row[]).map(mapDeal)
}

export function getDeal(db: Database.Database, id: number) {
  const deal = db.prepare('SELECT d.*, o.name AS organization_name, trim(c.first_name || \' \' || c.last_name) AS contact_name FROM deals d LEFT JOIN organizations o ON o.id = d.organization_id LEFT JOIN contacts c ON c.id = d.contact_id WHERE d.id = ?').get(id)
  if (!deal) return null
  return { ...mapDeal(deal as Row), activities: listActivities(db, { dealId: id }) }
}

export function createDeal(db: Database.Database, input: Omit<Deal, 'id' | 'createdAt' | 'organizationName' | 'contactName'>) {
  const result = db.prepare('INSERT INTO deals (name, organization_id, contact_id, stage, value, probability, close_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(input.name.trim(), input.organizationId || null, input.contactId || null, input.stage, input.value, input.probability, input.closeDate, new Date().toISOString())
  return getDeal(db, Number(result.lastInsertRowid))
}

export function updateDeal(db: Database.Database, id: number, input: Omit<Deal, 'id' | 'createdAt' | 'organizationName' | 'contactName'>) {
  db.prepare('UPDATE deals SET name = ?, organization_id = ?, contact_id = ?, stage = ?, value = ?, probability = ?, close_date = ? WHERE id = ?').run(input.name.trim(), input.organizationId || null, input.contactId || null, input.stage, input.value, input.probability, input.closeDate, id)
  return getDeal(db, id)
}

export function updateDealStage(db: Database.Database, id: number, stage: Stage) {
  db.prepare('UPDATE deals SET stage = ?, probability = CASE WHEN ? = \'Won\' THEN 100 WHEN ? = \'Lost\' THEN 0 ELSE probability END WHERE id = ?').run(stage, stage, stage, id)
  return getDeal(db, id)
}

export function deleteDeal(db: Database.Database, id: number) { return db.prepare('DELETE FROM deals WHERE id = ?').run(id).changes > 0 }

export function listActivities(db: Database.Database, filters: { contactId?: number; dealId?: number } = {}) {
  const clauses: string[] = []
  const args: number[] = []
  if (filters.contactId != null) { clauses.push('a.contact_id = ?'); args.push(filters.contactId) }
  if (filters.dealId != null) { clauses.push('a.deal_id = ?'); args.push(filters.dealId) }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return (db.prepare(`SELECT a.*, trim(c.first_name || ' ' || c.last_name) AS contact_name, d.name AS deal_name FROM activities a LEFT JOIN contacts c ON c.id = a.contact_id LEFT JOIN deals d ON d.id = a.deal_id ${where} ORDER BY datetime(a.occurred_at) DESC, a.id DESC`).all(...args) as Row[]).map(mapActivity)
}

export function createActivity(db: Database.Database, input: Omit<Activity, 'id' | 'contactName' | 'dealName'>) {
  const result = db.prepare('INSERT INTO activities (type, contact_id, deal_id, description, occurred_at, due_date, done) VALUES (?, ?, ?, ?, ?, ?, ?)').run(input.type, input.contactId || null, input.dealId || null, input.description.trim(), input.occurredAt || new Date().toISOString(), input.dueDate || null, input.done ? 1 : 0)
  return listActivities(db).find((activity) => activity.id === Number(result.lastInsertRowid)) ?? null
}

export function updateActivity(db: Database.Database, id: number, input: Omit<Activity, 'id' | 'contactName' | 'dealName'>) {
  db.prepare('UPDATE activities SET type = ?, contact_id = ?, deal_id = ?, description = ?, occurred_at = ?, due_date = ?, done = ? WHERE id = ?').run(input.type, input.contactId || null, input.dealId || null, input.description.trim(), input.occurredAt, input.dueDate || null, input.done ? 1 : 0, id)
  return listActivities(db).find((activity) => activity.id === id) ?? null
}

export function toggleActivity(db: Database.Database, id: number, done: boolean) {
  db.prepare('UPDATE activities SET done = ? WHERE id = ?').run(done ? 1 : 0, id)
  return listActivities(db).find((activity) => activity.id === id) ?? null
}

export function deleteActivity(db: Database.Database, id: number) { return db.prepare('DELETE FROM activities WHERE id = ?').run(id).changes > 0 }

export function getBootstrap(db: Database.Database) {
  return { organizations: listOrganizations(db), contacts: listContacts(db), deals: listDeals(db), activities: listActivities(db) }
}

export function closeDatabase(db: Database.Database) { db.close() }

export const newId = () => randomUUID()
