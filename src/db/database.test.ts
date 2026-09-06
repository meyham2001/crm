import { describe, it, expect, vi } from 'vitest'

// Mock the database initialization before importing repositories
vi.mock('./database', () => {
  const db = {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(() => ({ changes: 1, lastInsertRowid: 'test-id' })),
    })),
    exec: vi.fn(),
    pragma: vi.fn(),
    close: vi.fn(),
  }
  return {
    db,
    initializeDatabase: vi.fn(),
    closeDatabase: vi.fn(),
  }
})

import { organizationRepository } from './organizationRepository'
import type { Organization } from '../types'

describe('Organization Repository', () => {
  it('should create an organization', () => {
    const db = require('./database').db
    db.prepare.mockReturnValueOnce({
      run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 'test-org-id' }),
    })

    const org = organizationRepository.create({
      name: 'Test Org',
      website: 'https://test.com',
      industry: 'Technology',
      notes: 'Test notes',
    })

    expect(org.id).toBeDefined()
    expect(org.name).toBe('Test Org')
    expect(org.website).toBe('https://test.com')
    expect(org.industry).toBe('Technology')
    expect(org.notes).toBe('Test notes')
  })

  it('should find organization by id', () => {
    const mockOrg: Organization = {
      id: 'test-org-id',
      name: 'Test Org',
      website: 'https://test.com',
      industry: 'Technology',
      notes: 'Test notes',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const db = require('./database').db
    db.prepare.mockReturnValueOnce({
      get: vi.fn().mockReturnValue(mockOrg),
    })

    const found = organizationRepository.findById('test-org-id')
    expect(found).toEqual(mockOrg)
  })

  it('should find all organizations', () => {
    const mockOrgs = [
      { id: '1', name: 'Org 1', website: null, industry: null, notes: null, created_at: '', updated_at: '' },
      { id: '2', name: 'Org 2', website: null, industry: null, notes: null, created_at: '', updated_at: '' },
    ]

    const db = require('./database').db
    db.prepare.mockReturnValueOnce({
      all: vi.fn().mockReturnValue(mockOrgs),
    })

    const orgs = organizationRepository.findAll()
    expect(orgs.length).toBe(2)
  })

  it('should update an organization', () => {
    const mockOrg = {
      id: 'test-org-id',
      name: 'Updated Org',
      website: 'https://test.com',
      industry: 'Healthcare',
      notes: 'Test notes',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const db = require('./database').db
    db.prepare.mockReturnValueOnce({
      run: vi.fn().mockReturnValue({ changes: 1 }),
    })
    db.prepare.mockReturnValueOnce({
      get: vi.fn().mockReturnValue(mockOrg),
    })

    const updated = organizationRepository.update('test-org-id', {
      name: 'Updated Org',
      industry: 'Healthcare',
    })

    expect(updated?.name).toBe('Updated Org')
    expect(updated?.industry).toBe('Healthcare')
  })

  it('should search organizations', () => {
    const mockOrgs = [
      { id: '1', name: 'Updated Org', website: null, industry: 'Healthcare', notes: null, created_at: '', updated_at: '' },
    ]

    const db = require('./database').db
    db.prepare.mockReturnValueOnce({
      all: vi.fn().mockReturnValue(mockOrgs),
    })

    const results = organizationRepository.search('Updated')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Updated Org')
  })

  it('should delete an organization', () => {
    const db = require('./database').db
    db.prepare.mockReturnValueOnce({
      run: vi.fn().mockReturnValue({ changes: 1 }),
    })

    const deleted = organizationRepository.delete('test-org-id')
    expect(deleted).toBe(true)
  })
})