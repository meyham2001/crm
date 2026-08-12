import type { Activity, Bootstrap, Contact, Deal, DetailContact, DetailDeal, DetailOrganization, Organization, Stage } from './types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }, ...options })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${response.status})`)
  }
  return response.json()
}

export const api = {
  bootstrap: () => request<Bootstrap>('/api/bootstrap'),
  organization: (id: number) => request<DetailOrganization>(`/api/organizations/${id}`),
  createOrganization: (data: Omit<Organization, 'id' | 'createdAt' | 'contactCount' | 'dealCount'>) => request<DetailOrganization>('/api/organizations', { method: 'POST', body: JSON.stringify(data) }),
  updateOrganization: (id: number, data: Omit<Organization, 'id' | 'createdAt' | 'contactCount' | 'dealCount'>) => request<DetailOrganization>(`/api/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrganization: (id: number) => request<{ ok: boolean }>(`/api/organizations/${id}`, { method: 'DELETE' }),
  contact: (id: number) => request<DetailContact>(`/api/contacts/${id}`),
  createContact: (data: Omit<Contact, 'id' | 'createdAt' | 'organizationName'>) => request<DetailContact>('/api/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id: number, data: Omit<Contact, 'id' | 'createdAt' | 'organizationName'>) => request<DetailContact>(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (id: number) => request<{ ok: boolean }>(`/api/contacts/${id}`, { method: 'DELETE' }),
  deal: (id: number) => request<DetailDeal>(`/api/deals/${id}`),
  createDeal: (data: Omit<Deal, 'id' | 'createdAt' | 'organizationName' | 'contactName'>) => request<DetailDeal>('/api/deals', { method: 'POST', body: JSON.stringify(data) }),
  updateDeal: (id: number, data: Omit<Deal, 'id' | 'createdAt' | 'organizationName' | 'contactName'>) => request<DetailDeal>(`/api/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateDealStage: (id: number, stage: Stage) => request<DetailDeal>(`/api/deals/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  deleteDeal: (id: number) => request<{ ok: boolean }>(`/api/deals/${id}`, { method: 'DELETE' }),
  createActivity: (data: Omit<Activity, 'id' | 'contactName' | 'dealName'>) => request<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
  updateActivity: (id: number, data: Omit<Activity, 'id' | 'contactName' | 'dealName'>) => request<Activity>(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleActivity: (id: number, done: boolean) => request<Activity>(`/api/activities/${id}/done`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  deleteActivity: (id: number) => request<{ ok: boolean }>(`/api/activities/${id}`, { method: 'DELETE' }),
}
