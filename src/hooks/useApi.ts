import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { Organization, Contact, Deal, Activity } from '../types'

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.organizations.list()
      setOrganizations(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.organizations.list(query)
      setOrganizations(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search organizations')
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Partial<Organization>) => {
    const org = await api.organizations.create(data)
    setOrganizations(prev => [...prev, org].sort((a, b) => a.name.localeCompare(b.name)))
    return org
  }, [])

  const update = useCallback(async (id: string, data: Partial<Organization>) => {
    const org = await api.organizations.update(id, data)
    setOrganizations(prev => prev.map(o => o.id === id ? org : o))
    return org
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.organizations.delete(id)
    setOrganizations(prev => prev.filter(o => o.id !== id))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { organizations, loading, error, load, search, create, update, delete: remove }
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (params?: { q?: string; status?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.contacts.list(params)
      setContacts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback(async (query: string, status?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.contacts.list({ q: query, status })
      setContacts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search contacts')
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Partial<Contact>) => {
    const contact = await api.contacts.create(data)
    setContacts(prev => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)))
    return contact
  }, [])

  const update = useCallback(async (id: string, data: Partial<Contact>) => {
    const contact = await api.contacts.update(id, data)
    setContacts(prev => prev.map(c => c.id === id ? contact : c))
    return contact
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.contacts.delete(id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { contacts, loading, error, load, search, create, update, delete: remove }
}

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (params?: { q?: string; stage?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.deals.list(params)
      setDeals(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Partial<import('../types').Deal>) => {
    const deal = await api.deals.create(data)
    setDeals(prev => [...prev, deal])
    return deal
  }, [])

  const update = useCallback(async (id: string, data: Partial<import('../types').Deal>) => {
    const deal = await api.deals.update(id, data)
    setDeals(prev => prev.map(d => d.id === id ? deal : d))
    return deal
  }, [])

  const updateStage = useCallback(async (id: string, stage: string) => {
    const deal = await api.deals.updateStage(id, stage)
    setDeals(prev => prev.map(d => d.id === id ? deal : d))
    return deal
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.deals.delete(id)
    setDeals(prev => prev.filter(d => d.id !== id))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { deals, loading, error, load, create, update, updateStage, delete: remove }
}

export function useActivities(contactId?: string, dealId?: string) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.activities.list({ contact_id: contactId, deal_id: dealId })
      setActivities(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [contactId, dealId])

  const create = useCallback(async (data: Partial<Activity>) => {
    const activity = await api.activities.create(data)
    setActivities(prev => [activity, ...prev])
    return activity
  }, [])

  const update = useCallback(async (id: string, data: Partial<Activity>) => {
    const activity = await api.activities.update(id, data)
    setActivities(prev => prev.map(a => a.id === id ? activity : a))
    return activity
  }, [])

  const toggleDone = useCallback(async (id: string) => {
    const activity = await api.activities.toggleDone(id)
    setActivities(prev => prev.map(a => a.id === id ? activity : a))
    return activity
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.activities.delete(id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { activities, loading, error, load, create, update, toggleDone, delete: remove }
}

export function useDashboard() {
  const [data, setData] = useState<{
    dealsWonPerMonth: { month: string; count: number }[]
    revenueWonPerMonth: { month: string; revenue: number }[]
    pipelineStats: { stage: string; count: number; totalValue: number; expectedRevenue: number }[]
    recentActivities: (Activity & { contact_name?: string; deal_name?: string; organization_name?: string })[]
    upcomingTasks: (Activity & { contact_name?: string; deal_name?: string })[]
    overdueTasks: (Activity & { contact_name?: string; deal_name?: string })[]
    totalDeals: number
    totalOrgs: number
    totalContacts: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dashboard = await api.dashboard.get()
      setData(dashboard)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}