import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users,
  Handshake,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Globe,
  FileText,
  Phone,
  Mail,
} from 'lucide-react'
import { api } from '../api/client'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, createColumnHelper } from '../components/DataTable'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/helpers'
import { cn } from '../utils/helpers'
import type { Organization, Contact, Deal, Activity } from '../types'

const contactColumnHelper = createColumnHelper<Contact>()
const dealColumnHelper = createColumnHelper<Deal>()

export function OrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'deals' | 'activities'>('overview')

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  async function loadData() {
    if (!id) return
    setIsLoading(true)
    try {
      const [org, allContacts, allDeals] = await Promise.all([
        api.organizations.get(id),
        api.contacts.list(),
        api.deals.list(),
      ])
      if (!org) {
        navigate('/organizations')
        return
      }
      setOrganization(org)
      setFormData({
        name: org.name,
        website: org.website || '',
        industry: org.industry || '',
        notes: org.notes || '',
      })
      const orgContacts = allContacts.filter(c => c.organization_id === id)
      const orgDeals = allDeals.filter(d => d.organization_id === id)
      setContacts(orgContacts)
      setDeals(orgDeals)
      const acts = await api.activities.list()
      setActivities(acts.filter(a =>
        orgDeals.some(d => d.id === a.deal_id) || orgContacts.some(c => c.id === a.contact_id)
      ).slice(0, 20))
    } catch {
      navigate('/organizations')
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit() {
    setErrors({})
    setIsEditModalOpen(true)
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (formData.website && !isValidUrl(formData.website)) newErrors.website = 'Please enter a valid URL'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function isValidUrl(url: string): boolean {
    try { new URL(url.startsWith('http') ? url : `https://${url}`); return true } catch { return false }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !organization) return
    await api.organizations.update(organization.id, formData)
    await loadData()
    setIsEditModalOpen(false)
  }

  async function handleDelete() {
    if (organization) {
      await api.organizations.delete(organization.id)
      navigate('/organizations')
    }
  }

  const contactColumns = [
    contactColumnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Avatar name={info.getValue() as string} size="sm" />
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        </div>
      ),
    }),
    contactColumnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => info.getValue() ? (
        <a href={`mailto:${info.getValue()}`} className="text-brand-blue hover:underline text-sm">{info.getValue()}</a>
      ) : <span className="text-gray-400">—</span>,
    }),
    contactColumnHelper.accessor('job_title', {
      header: 'Title',
      cell: (info) => info.getValue() ? <span className="text-gray-600">{info.getValue()}</span> : <span className="text-gray-400">—</span>,
    }),
    contactColumnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as string
        const variants: Record<string, 'amber' | 'blue' | 'green'> = { lead: 'amber', qualified: 'blue', customer: 'green' }
        return <Badge variant={variants[status] || 'gray'} className="text-xs capitalize">{status}</Badge>
      },
    }),
  ]

  const dealColumns = [
    dealColumnHelper.accessor('name', {
      header: 'Deal Name',
      cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
    }),
    dealColumnHelper.accessor('stage', {
      header: 'Stage',
      cell: (info) => {
        const stage = info.getValue() as string
        const variants: Record<string, 'gray' | 'blue' | 'purple' | 'amber' | 'green' | 'red'> = {
          new: 'gray', qualified: 'blue', proposal: 'purple', negotiation: 'amber', won: 'green', lost: 'red'
        }
        return <Badge variant={variants[stage] || 'gray'} className="text-xs capitalize">{stage}</Badge>
      },
    }),
    dealColumnHelper.accessor('value', {
      header: 'Value',
      cell: (info) => <span className="font-medium text-gray-900">{formatCurrency(info.getValue() as number)}</span>,
    }),
    dealColumnHelper.accessor('probability', {
      header: 'Probability',
      cell: (info) => <span className="text-gray-600">{(info.getValue() as number)}%</span>,
    }),
    dealColumnHelper.accessor('close_date', {
      header: 'Close Date',
      cell: (info) => <span className="text-gray-600">{formatDate(info.getValue() as string)}</span>,
    }),
  ]

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!organization) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/organizations')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-gray-500">{organization.industry || 'No industry specified'}</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Website</h3>
            <p className="mt-1">
              {organization.website ? (
                <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {organization.website.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <span className="text-gray-400">Not specified</span>
              )}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Industry</h3>
            <p className="mt-1">{organization.industry || <span className="text-gray-400">Not specified</span>}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p className="mt-1 text-gray-600">{formatDate(organization.created_at)}</p>
          </div>
        </div>
        {organization.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-gray-600 whitespace-pre-wrap">{organization.notes}</p>
          </div>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleEdit} icon={<Edit className="w-4 h-4" />}>Edit</Button>
          <Button variant="danger" onClick={() => setDeleteConfirm(true)} icon={<Trash2 className="w-4 h-4" />}>Delete</Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Organization tabs">
          {[
            { id: 'overview', label: 'Overview', count: contacts.length + deals.length },
            { id: 'contacts', label: 'Contacts', count: contacts.length },
            { id: 'deals', label: 'Deals', count: deals.length },
            { id: 'activities', label: 'Activity', count: activities.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'py-3 px-1 border-b-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-brand-amber text-brand-amber'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label} <span className="ml-2 text-xs text-gray-400">({tab.count})</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                Contacts ({contacts.length})
              </h3>
              {contacts.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No contacts yet</p>
              ) : (
                <ul className="space-y-2">
                  {contacts.slice(0, 5).map((contact) => (
                    <li key={contact.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                      <Avatar name={contact.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                        <p className="text-sm text-gray-500 truncate">{contact.job_title || 'No title'} • {contact.email || 'No email'}</p>
                      </div>
                      <Badge variant={contact.status === 'lead' ? 'amber' : contact.status === 'qualified' ? 'blue' : 'green'} className="text-xs capitalize">
                        {contact.status}
                      </Badge>
                    </li>
                  ))}
                  {contacts.length > 5 && (
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className="w-full text-sm text-brand-blue hover:underline py-2"
                    >
                      View all {contacts.length} contacts
                    </button>
                  )}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-gray-500" />
                Deals ({deals.length})
              </h3>
              {deals.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No deals yet</p>
              ) : (
                <ul className="space-y-2">
                  {deals.slice(0, 5).map((deal) => {
                    const variants: Record<string, 'gray' | 'blue' | 'purple' | 'amber' | 'green' | 'red'> = {
                      new: 'gray', qualified: 'blue', proposal: 'purple', negotiation: 'amber', won: 'green', lost: 'red'
                    }
                    return (
                      <li key={deal.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{deal.name}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(deal.value)} • {formatDate(deal.close_date)}</p>
                        </div>
                        <Badge variant={variants[deal.stage] || 'gray'} className="text-xs capitalize">{deal.stage}</Badge>
                      </li>
                    )
                  })}
                  {deals.length > 5 && (
                    <button
                      onClick={() => setActiveTab('deals')}
                      className="w-full text-sm text-brand-blue hover:underline py-2"
                    >
                      View all {deals.length} deals
                    </button>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
              <Button onClick={() => navigate(`/contacts/new?org=${id}`)} icon={<Plus className="w-4 h-4" />}>
                Add Contact
              </Button>
            </div>
            <DataTable
              data={contacts}
              columns={contactColumns}
              searchKey="name"
              onRowClick={(contact) => navigate(`/contacts/${contact.id}`)}
              emptyMessage="No contacts for this organization"
            />
          </>
        )}

        {activeTab === 'deals' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Deals</h3>
              <Button onClick={() => navigate(`/deals/new?org=${id}`)} icon={<Plus className="w-4 h-4" />}>
                Add Deal
              </Button>
            </div>
            <DataTable
              data={deals}
              columns={dealColumns}
              searchKey="name"
              onRowClick={(deal) => navigate(`/deals/${deal.id}`)}
              emptyMessage="No deals for this organization"
            />
          </>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activity yet</p>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} contacts={contacts} deals={deals} />
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Organization"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Name"
            name="name"
            required
            error={errors.name}
            children={<Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Acme Corporation" required />}
          />
          <FormField
            label="Website"
            name="website"
            placeholder="https://example.com"
            children={<Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://example.com" />}
          />
          <FormField
            label="Industry"
            name="industry"
            placeholder="Technology"
            children={<Input value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} placeholder="Technology" />}
          />
          <FormField
            label="Notes"
            name="notes"
            children={<Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." />}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Organization"
        message={`Are you sure you want to delete "${organization.name}"? This will also remove associated contacts and deals.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

function ActivityItem({ activity, contacts, deals }: { activity: Activity; contacts: Contact[]; deals: Deal[] }) {
  const typeColors = {
    note: 'bg-blue-100 text-blue-600',
    call: 'bg-green-100 text-green-600',
    email: 'bg-purple-100 text-purple-600',
  }

  const contact = contacts.find(c => c.id === activity.contact_id)
  const deal = deals.find(d => d.id === activity.deal_id)

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', typeColors[activity.type as keyof typeof typeColors])}>
        {activity.type === 'note' && <FileText className="w-4 h-4" />}
        {activity.type === 'call' && <Phone className="w-4 h-4" />}
        {activity.type === 'email' && <Mail className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {contact && (
            <span className="flex items-center gap-1">
              <Avatar name={contact.name} size="sm" />
              <span>{contact.name}</span>
            </span>
          )}
          {deal && (
            <span className="flex items-center gap-1 text-brand-blue">
              <Handshake className="w-3 h-3" />
              {deal.name}
            </span>
          )}
          <span>{formatRelativeTime(activity.occurred_at)}</span>
        </div>
      </div>
      <Badge variant={activity.type as any} className="text-xs capitalize">{activity.type}</Badge>
    </div>
  )
}