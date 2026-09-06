const API_BASE = '/api'

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  organizations: {
    list: (query?: string) => fetchApi<import('../types').Organization[]>(`/organizations${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    get: (id: string) => fetchApi<import('../types').Organization>(`/organizations/${id}`),
    create: (data: Partial<import('../types').Organization>) => fetchApi<import('../types').Organization>('/organizations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').Organization>) => fetchApi<import('../types').Organization>(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/organizations/${id}`, { method: 'DELETE' }),
  },

  contacts: {
    list: (params?: { q?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.q) searchParams.set('q', params.q)
      if (params?.status) searchParams.set('status', params.status)
      return fetchApi<import('../types').Contact[]>(`/contacts${searchParams.toString() ? `?${searchParams.toString()}` : ''}`)
    },
    get: (id: string) => fetchApi<import('../types').Contact>(`/contacts/${id}`),
    create: (data: Partial<import('../types').Contact>) => fetchApi<import('../types').Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').Contact>) => fetchApi<import('../types').Contact>(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/contacts/${id}`, { method: 'DELETE' }),
  },

  deals: {
    list: (params?: { q?: string; stage?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.q) searchParams.set('q', params.q)
      if (params?.stage) searchParams.set('stage', params.stage)
      return fetchApi<import('../types').Deal[]>(`/deals${searchParams.toString() ? `?${searchParams.toString()}` : ''}`)
    },
    get: (id: string) => fetchApi<import('../types').Deal>(`/deals/${id}`),
    create: (data: Partial<import('../types').Deal>) => fetchApi<import('../types').Deal>('/deals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').Deal>) => fetchApi<import('../types').Deal>(`/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStage: (id: string, stage: string) => fetchApi<import('../types').Deal>(`/deals/${id}/stage`, { method: 'PUT', body: JSON.stringify({ stage }) }),
    delete: (id: string) => fetchApi<void>(`/deals/${id}`, { method: 'DELETE' }),
  },

  activities: {
    list: (params?: { contact_id?: string; deal_id?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.contact_id) searchParams.set('contact_id', params.contact_id)
      if (params?.deal_id) searchParams.set('deal_id', params.deal_id)
      return fetchApi<import('../types').Activity[]>(`/activities${searchParams.toString() ? `?${searchParams.toString()}` : ''}`)
    },
    get: (id: string) => fetchApi<import('../types').Activity>(`/activities/${id}`),
    create: (data: Partial<import('../types').Activity>) => fetchApi<import('../types').Activity>('/activities', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types').Activity>) => fetchApi<import('../types').Activity>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleDone: (id: string) => fetchApi<import('../types').Activity>(`/activities/${id}/done`, { method: 'PUT' }),
    delete: (id: string) => fetchApi<void>(`/activities/${id}`, { method: 'DELETE' }),
  },

  dashboard: {
    get: () => fetchApi<{
      dealsWonPerMonth: { month: string; count: number }[]
      revenueWonPerMonth: { month: string; revenue: number }[]
      pipelineStats: { stage: string; count: number; totalValue: number; expectedRevenue: number }[]
      recentActivities: (import('../types').Activity & { contact_name?: string; deal_name?: string; organization_name?: string })[]
      upcomingTasks: (import('../types').Activity & { contact_name?: string; deal_name?: string })[]
      overdueTasks: (import('../types').Activity & { contact_name?: string; deal_name?: string })[]
      totalDeals: number
      totalOrgs: number
      totalContacts: number
    }>('/dashboard'),
  },
}