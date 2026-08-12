import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  closeDatabase, createActivity, createContact, createDeal, createOrganization, deleteActivity, deleteContact, deleteDeal,
  deleteOrganization, getContact, getDeal, getOrganization, initDatabase, listActivities, listContacts, listDeals, listOrganizations,
  toggleActivity, updateContact, updateDeal, updateDealStage, updateOrganization,
} from '../server/db'

describe('Personal CRM SQLite data layer', () => {
  let db: ReturnType<typeof initDatabase>

  beforeEach(() => { db = initDatabase(':memory:') })
  afterEach(() => closeDatabase(db))

  it('seeds realistic records on first launch', () => {
    expect(listOrganizations(db)).toHaveLength(5)
    expect(listContacts(db)).toHaveLength(7)
    expect(listDeals(db)).toHaveLength(8)
    expect(listActivities(db)).toHaveLength(8)
  })

  it('creates, reads, updates, and deletes organizations', () => {
    const created = createOrganization(db, { name: 'Test Org', website: 'test.org', industry: 'Testing', notes: 'Initial notes' })!
    expect(getOrganization(db, created.id)?.name).toBe('Test Org')
    const updated = updateOrganization(db, created.id, { name: 'Updated Org', website: 'updated.org', industry: 'Software', notes: 'Updated' })!
    expect(updated?.website).toBe('updated.org')
    expect(deleteOrganization(db, created.id)).toBe(true)
    expect(getOrganization(db, created.id)).toBeNull()
  })

  it('creates, reads, updates, deletes, and searches contacts', () => {
    const organization = listOrganizations(db)[0]
    const created = createContact(db, { firstName: 'Searchable', lastName: 'Person', email: 'searchable@example.com', phone: '555', title: 'Tester', status: 'lead', organizationId: organization.id })!
    expect(listContacts(db, 'searchable')).toHaveLength(1)
    expect(listContacts(db, 'searchable@example.com')).toHaveLength(1)
    expect(listContacts(db, '', 'lead').some((contact) => contact.id === created.id)).toBe(true)
    const updated = updateContact(db, created.id, { firstName: 'Edited', lastName: 'Person', email: 'edited@example.com', phone: '555-2', title: 'Director', status: 'qualified', organizationId: organization.id })!
    expect(updated?.status).toBe('qualified')
    expect(getContact(db, created.id)?.email).toBe('edited@example.com')
    expect(deleteContact(db, created.id)).toBe(true)
  })

  it('creates, reads, updates, deletes, and moves deals across Won and Lost', () => {
    const organization = listOrganizations(db)[0]
    const contact = listContacts(db)[0]
    const created = createDeal(db, { name: 'Test opportunity', organizationId: organization.id, contactId: contact.id, stage: 'New', value: 42000, probability: 25, closeDate: '2030-01-01' })!
    expect(listDeals(db, 'Test opportunity').map((deal) => deal.id)).toContain(created.id)
    expect(updateDealStage(db, created.id, 'Won')?.stage).toBe('Won')
    expect(getDeal(db, created.id)?.probability).toBe(100)
    expect(updateDealStage(db, created.id, 'Lost')?.stage).toBe('Lost')
    expect(getDeal(db, created.id)?.probability).toBe(0)
    const updated = updateDeal(db, created.id, { name: 'Edited opportunity', organizationId: organization.id, contactId: contact.id, stage: 'Proposal', value: 50000, probability: 70, closeDate: '2030-02-01' })!
    expect(updated.name).toBe('Edited opportunity')
    expect(deleteDeal(db, created.id)).toBe(true)
  })

  it('creates activities and persists task completion toggles', () => {
    const contact = listContacts(db)[0]
    const deal = listDeals(db)[0]
    const created = createActivity(db, { type: 'call', contactId: contact.id, dealId: deal.id, description: 'Test follow-up', occurredAt: new Date().toISOString(), dueDate: '2030-03-04', done: false })!
    expect(listActivities(db, { contactId: contact.id }).some((activity) => activity.id === created.id)).toBe(true)
    expect(toggleActivity(db, created.id, true)?.done).toBe(true)
    expect(toggleActivity(db, created.id, false)?.done).toBe(false)
    expect(deleteActivity(db, created.id)).toBe(true)
  })
})
