import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Mail,
  Phone,
} from 'lucide-react'
import { api } from '../api/client'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { Select } from '../components/Select'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { formatCurrency, formatDate, formatRelativeTime, isOverdue } from '../utils/helpers'
import { cn } from '../utils/helpers'
import type { Deal, DealStage, Activity, ActivityType, Organization, Contact } from '../types'

const STAGES: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'email']

export function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'activities'>('overview')
  const [formData, setFormData] = useState({
    organization_id: '',
    contact_id: '',
    name: '',
    stage: 'new' as DealStage,
    value: 0,
    probability: 50,
    close_date: '',
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
  const [contacts, setContacts] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  async function loadData() {
    if (!id) return
    setIsLoading(true)
    try {
      const [d, allOrgs, allContacts, dealActivities] = await Promise.all([
        api.deals.get(id),
        api.organizations.list(),
        api.contacts.list(),
        api.activities.list({ deal_id: id }),
      ])
      if (!d) {
        navigate('/deals')
        return
      }
      setDeal(d)
      setOrganizations(allOrgs)
      setContacts(allContacts)
      setFormData({
        organization_id: d.organization_id,
        contact_id: d.contact_id || '',
        name: d.name,
        stage: d.stage,
        value: d.value,
        probability: d.probability,
        close_date: d.close_date ? d.close_date.slice(0, 10) : '',
        notes: d.notes || '',
      })
      setOrganization(allOrgs.find(o => o.id === d.organization_id) || null)
      if (d.contact_id) {
        setContact(allContacts.find(c => c.id === d.contact_id) || null)
      } else {
        setContact(null)
      }
      setActivities(dealActivities)
    } catch {
      navigate('/deals')
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
    if (!formData.name.trim()) newErrors.name = 'Deal name is required'
    if (!formData.organization_id) newErrors.organization_id = 'Organization is required'
    if (formData.value < 0) newErrors.value = 'Value must be positive'
    if (formData.probability < 0 || formData.probability > 100) newErrors.probability = 'Probability must be between 0 and 100'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !deal) return

    const data = {
      organization_id: formData.organization_id,
      contact_id: formData.contact_id || undefined,
      name: formData.name,
      stage: formData.stage,
      value: formData.value,
      probability: formData.probability,
      close_date: formData.close_date || undefined,
      notes: formData.notes || undefined,
    }

    await api.deals.update(deal.id, data)
    await loadData()
    setIsEditModalOpen(false)
  }

  async function handleDelete() {
    if (deal) {
      await api.deals.delete(deal.id)
      navigate('/deals')
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
    if (!validateActivityForm() || !deal) return

    await api.activities.create({
      contact_id: deal.contact_id || undefined,
      deal_id: deal.id,
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

  const stageVariants: Record<DealStage, 'gray' | 'blue' | 'purple' | 'amber' | 'green' | 'red'> = {
    new: 'gray', qualified: 'blue', proposal: 'purple', negotiation: 'amber', won: 'green', lost: 'red'
  }

  const expectedRevenue = deal ? deal.value * deal.probability / 100 : 0

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!deal) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/deals')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <Badge variant={stageVariants[deal.stage]} className="text-sm capitalize">{deal.stage}</Badge>
            <span className="font-medium text-gray-900">{formatCurrency(deal.value)}</span>
            <span className="text-gray-600">{deal.probability}% probability</span>
            {deal.close_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(deal.close_date)}</span>}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Organization</h3>
            <p className="mt-1">
              {organization ? (
                <span className="text-brand-blue hover:underline" onClick={() => navigate(`/organizations/${organization.id}`)}>
                  {organization.name}
                </span>
              ) : <span className="text-gray-400">—</span>}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Primary Contact</h3>
            <p className="mt-1">
              {contact ? (
                <span className="flex items-center gap-1" onClick={() => navigate(`/contacts/${contact.id}`)}>
                  <Avatar name={contact.name} size="sm" />
                  <span className="text-brand-blue hover:underline">{contact.name}</span>
                </span>
              ) : <span className="text-gray-400">No primary contact</span>}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Expected Revenue</h3>
            <p className="mt-1 font-semibold text-brand-blue">{formatCurrency(expectedRevenue)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Close Date</h3>
            <p className="mt-1">{deal.close_date ? formatDate(deal.close_date) : <span className="text-gray-400">Not set</span>}</p>
          </div>
        </div>
        {deal.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-gray-600 whitespace-pre-wrap">{deal.notes}</p>
          </div>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleEdit} icon={<Edit className="w-4 h-4" />}>Edit</Button>
          <Button variant="danger" onClick={() => setDeleteConfirm(true)} icon={<Trash2 className="w-4 h-4" />}>Delete</Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Deal tabs">
          {[
            { id: 'overview', label: 'Overview', count: activities.length },
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
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              Recent Activity ({activities.length})
            </h3>
            {activities.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">No activity yet</p>
            ) : (
              <ul className="space-y-2">
                {activities.slice(0, 10).map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} onToggleDone={toggleActivityDone} />
                ))}
                {activities.length > 10 && (
                  <button onClick={() => setActiveTab('activities')} className="w-full text-sm text-brand-blue hover:underline py-2">
                    View all activity
                  </button>
                )}
              </ul>
            )}
          </div>
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
        title="Edit Deal"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Organization"
            name="organization_id"
            required
            error={errors.organization_id}
            children={
              <Select
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                options={organizations.map(o => ({ value: o.id, label: o.name }))}
              />
            }
          />
          <FormField
            label="Contact"
            name="contact_id"
            children={
              <Select
                value={formData.contact_id}
                onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                options={[
                  { value: '', label: 'No primary contact' },
                  ...contacts
                    .filter(c => !formData.organization_id || c.organization_id === formData.organization_id)
                    .map(c => ({ value: c.id, label: c.name })),
                ]}
              />
            }
          />
          <FormField
            label="Deal Name"
            name="name"
            required
            error={errors.name}
            children={<Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enterprise License Renewal" required />}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Stage"
              name="stage"
              required
              children={
                <Select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as DealStage })}
                  options={STAGES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                />
              }
            />
            <FormField
              label="Value (USD)"
              name="value"
              required
              error={errors.value}
              children={<Input type="number" min="0" step="1000" value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} placeholder="50000" required />}
            />
            <FormField
              label="Probability (%)"
              name="probability"
              required
              error={errors.probability}
              children={<Input type="number" min="0" max="100" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })} placeholder="50" required />}
            />
          </div>
          <FormField
            label="Expected Close Date"
            name="close_date"
            children={<Input type="date" value={formData.close_date} onChange={(e) => setFormData({ ...formData, close_date: e.target.value })} />}
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
        title="Delete Deal"
        message={`Are you sure you want to delete "${deal.name}"?`}
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