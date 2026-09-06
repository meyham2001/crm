import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Handshake,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { api } from '../api/client'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { Select } from '../components/Select'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, createColumnHelper } from '../components/DataTable'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { formatCurrency, formatDate, formatRelativeTime, isOverdue } from '../utils/helpers'
import { cn } from '../utils/helpers'
import type { Contact, Deal, Activity, ContactStatus, ActivityType } from '../types'

const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'email']
const STATUSES: ContactStatus[] = ['lead', 'qualified', 'customer']
const dealColumnHelper = createColumnHelper<Deal>()

export function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [contact, setContact] = useState<Contact | null>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'activities'>('overview')
  const [formData, setFormData] = useState({
    organization_id: '',
    name: '',
    email: '',
    phone: '',
    job_title: '',
    status: 'lead' as ContactStatus,
    notes: '',
  })
  const [activityFormData, setActivityFormData] = useState({
    type: 'note' as ActivityType,
    description: '',
    occurred_at: new Date().toISOString().slice(0, 16),
    due_date: '',
    done: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({})

  const [organizations, setOrganizations] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  async function loadData() {
    if (!id) return
    setIsLoading(true)
    try {
      const [c, allOrgs, allDeals, contactActivities] = await Promise.all([
        api.contacts.get(id),
        api.organizations.list(),
        api.deals.list(),
        api.activities.list({ contact_id: id }),
      ])
      if (!c) {
        navigate('/contacts')
        return
      }
      setContact(c)
      setOrganizations(allOrgs)
      setFormData({
        organization_id: c.organization_id || '',
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        job_title: c.job_title || '',
        status: c.status,
        notes: c.notes || '',
      })
      if (c.organization_id) {
        setOrganization(allOrgs.find(o => o.id === c.organization_id) || null)
      } else {
        setOrganization(null)
      }
      setDeals(allDeals.filter(d => d.contact_id === c.id))
      setActivities(contactActivities)
    } catch {
      navigate('/contacts')
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
    if (formData.email && !isValidEmail(formData.email)) newErrors.email = 'Please enter a valid email'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !contact) return

    const data = {
      organization_id: formData.organization_id || undefined,
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      job_title: formData.job_title || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
    }

    await api.contacts.update(contact.id, data)
    await loadData()
    setIsEditModalOpen(false)
  }

  async function handleDelete() {
    if (contact) {
      await api.contacts.delete(contact.id)
      navigate('/contacts')
    }
  }

  function handleAddActivity() {
    setActivityFormData({
      type: 'note',
      description: '',
      occurred_at: new Date().toISOString().slice(0, 16),
      due_date: '',
      done: false,
    })
    setActivityErrors({})
    setIsActivityModalOpen(true)
  }

  function validateActivityForm(): boolean {
    const newErrors: Record<string, string> = {}
    if (!activityFormData.description.trim()) newErrors.description = 'Description is required'
    if (activityFormData.due_date && isOverdue(activityFormData.due_date) && !activityFormData.done) {
      newErrors.due_date = 'Due date is in the past'
    }
    setActivityErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleActivitySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateActivityForm() || !contact) return

    await api.activities.create({
      contact_id: contact.id,
      deal_id: searchParams.get('deal') || undefined,
      type: activityFormData.type,
      description: activityFormData.description,
      occurred_at: activityFormData.occurred_at,
      due_date: activityFormData.due_date || undefined,
      done: activityFormData.done ? 1 : 0,
    } as any)
    await loadData()
    setIsActivityModalOpen(false)
  }

  async function toggleActivityDone(activity: Activity) {
    await api.activities.toggleDone(activity.id)
    await loadData()
  }

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

  if (!contact) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex items-center gap-4">
          <Avatar name={contact.name} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {contact.job_title && <span>{contact.job_title}</span>}
              {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
              {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <Badge variant={contact.status === 'lead' ? 'amber' : contact.status === 'qualified' ? 'blue' : 'green'} className="mt-1 text-sm capitalize">
              {contact.status}
            </Badge>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Organization</h3>
            <p className="mt-1">
              {organization ? (
                <span className="text-brand-blue hover:underline" onClick={() => navigate(`/organizations/${organization.id}`)}>
                  {organization.name}
                </span>
              ) : (
                <span className="text-gray-400">No organization</span>
              )}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p className="mt-1 text-gray-600">{formatDate(contact.created_at)}</p>
          </div>
        </div>
        {contact.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleEdit} icon={<Edit className="w-4 h-4" />}>Edit</Button>
          <Button variant="danger" onClick={() => setDeleteConfirm(true)} icon={<Trash2 className="w-4 h-4" />}>Delete</Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Contact tabs">
          {[
            { id: 'overview', label: 'Overview', count: deals.length + activities.length },
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
                    <button onClick={() => setActiveTab('deals')} className="w-full text-sm text-brand-blue hover:underline py-2">
                      View all {deals.length} deals
                    </button>
                  )}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Recent Activity ({activities.length})
              </h3>
              {activities.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No activity yet</p>
              ) : (
                <ul className="space-y-2">
                  {activities.slice(0, 5).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} onToggleDone={toggleActivityDone} />
                  ))}
                  {activities.length > 5 && (
                    <button onClick={() => setActiveTab('activities')} className="w-full text-sm text-brand-blue hover:underline py-2">
                      View all activity
                    </button>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Deals</h3>
              <Button onClick={() => navigate(`/deals/new?contact=${id}`)} icon={<Plus className="w-4 h-4" />}>
                Add Deal
              </Button>
            </div>
            <DataTable
              data={deals}
              columns={dealColumns}
              searchKey="name"
              onRowClick={(deal) => navigate(`/deals/${deal.id}`)}
              emptyMessage="No deals for this contact"
            />
          </>
        )}

        {activeTab === 'activities' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
              <Button onClick={handleAddActivity} icon={<Plus className="w-4 h-4" />}>
                Log Activity
              </Button>
            </div>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activity yet</p>
              ) : (
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} onToggleDone={toggleActivityDone} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Contact"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Organization"
            name="organization_id"
            children={
              <Select
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                options={[
                  { value: '', label: 'No organization' },
                  ...organizations.map(o => ({ value: o.id, label: o.name })),
                ]}
              />
            }
          />
          <FormField
            label="Name"
            name="name"
            required
            error={errors.name}
            children={<Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" required />}
          />
          <FormField
            label="Email"
            name="email"
            error={errors.email}
            children={<Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />}
          />
          <FormField
            label="Phone"
            name="phone"
            children={<Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1-555-123-4567" />}
          />
          <FormField
            label="Job Title"
            name="job_title"
            children={<Input value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} placeholder="VP of Sales" />}
          />
          <FormField
            label="Status"
            name="status"
            required
            children={
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ContactStatus })}
                options={STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
              />
            }
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

      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Log Activity"
        size="lg"
      >
        <form onSubmit={handleActivitySubmit} className="space-y-4">
          <FormField
            label="Type"
            name="type"
            required
            children={
              <Select
                value={activityFormData.type}
                onChange={(e) => setActivityFormData({ ...activityFormData, type: e.target.value as ActivityType })}
                options={ACTIVITY_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              />
            }
          />
          <FormField
            label="Description"
            name="description"
            required
            error={activityErrors.description}
            children={<Textarea value={activityFormData.description} onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })} placeholder="What happened?" required />}
          />
          <FormField
            label="Occurred At"
            name="occurred_at"
            required
            children={<Input type="datetime-local" value={activityFormData.occurred_at} onChange={(e) => setActivityFormData({ ...activityFormData, occurred_at: e.target.value })} required />}
          />
          <FormField
            label="Due Date (optional)"
            name="due_date"
            error={activityErrors.due_date}
            children={<Input type="date" value={activityFormData.due_date} onChange={(e) => setActivityFormData({ ...activityFormData, due_date: e.target.value })} />}
          />
          <FormField
            label="Mark as Done"
            name="done"
            children={
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activityFormData.done}
                  onChange={(e) => setActivityFormData({ ...activityFormData, done: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                />
                <span className="text-sm text-gray-700">This activity is complete</span>
              </label>
            }
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsActivityModalOpen(false)}>Cancel</Button>
            <Button type="submit">Log Activity</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete "${contact.name}"? This will also remove associated activities.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

function ActivityItem({ activity, onToggleDone }: { activity: Activity; onToggleDone: (a: Activity) => void }) {
  const typeColors = {
    note: 'bg-blue-100 text-blue-600',
    call: 'bg-green-100 text-green-600',
    email: 'bg-purple-100 text-purple-600',
  }

  const typeIcons = {
    note: FileText,
    call: Phone,
    email: Mail,
  }

  const Icon = typeIcons[activity.type as keyof typeof typeIcons] || FileText
  const isTaskDue = activity.due_date && !activity.done
  const overdue = isTaskDue && isOverdue(activity.due_date)

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', typeColors[activity.type as keyof typeof typeColors])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="text-sm text-gray-900 flex-1">{activity.description}</p>
          {activity.due_date && !activity.done && (
            <Badge variant={overdue ? 'red' : 'amber'} className="text-xs flex-shrink-0">
              {overdue ? 'Overdue' : 'Due'} {formatDate(activity.due_date)}
            </Badge>
          )}
          {activity.done && (
            <Badge variant="green" className="text-xs flex-shrink-0">
              <CheckCircle className="w-3 h-3 mr-1" />
              Done
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{formatRelativeTime(activity.occurred_at)}</span>
          {activity.due_date && (
            <span className="flex items-center gap-1" style={{ color: overdue ? '#ef4444' : '#f59e0b' }}>
              <Calendar className="w-3 h-3" />
              {formatDate(activity.due_date)}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggleDone(activity)}
        aria-label={activity.done ? 'Mark as not done' : 'Mark as done'}
      >
        {activity.done ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-gray-400" />}
      </Button>
    </div>
  )
}