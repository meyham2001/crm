import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { DataTable, createColumnHelper } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { Select } from '../components/Select'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Badge } from '../components/Badge'
import { formatCurrency, formatDate } from '../utils/helpers'
import type { Deal, DealStage, Organization, Contact } from '../types'

const STAGES: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
const dealColumnHelper = createColumnHelper<Deal>()

export function Deals() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [deals, setDeals] = useState<Deal[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Deal | null>(null)
  const [stageFilter, setStageFilter] = useState<DealStage | 'all'>('all')
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [stageFilter])

  async function loadData() {
    setIsLoading(true)
    try {
      const [orgs, conts, dealsData] = await Promise.all([
        api.organizations.list(),
        api.contacts.list(),
        api.deals.list(stageFilter === 'all' ? undefined : { stage: stageFilter }),
      ])
      setOrganizations(orgs)
      setContacts(conts)
      setDeals(dealsData)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSearch(query: string) {
    setIsLoading(true)
    try {
      const dealsData = await api.deals.list({ q: query, stage: stageFilter === 'all' ? undefined : stageFilter })
      setDeals(dealsData)
    } finally {
      setIsLoading(false)
    }
  }

  function handleNew() {
    const orgId = searchParams.get('org')
    const contactId = searchParams.get('contact')
    setEditingDeal(null)
    setFormData({
      organization_id: orgId || '',
      contact_id: contactId || '',
      name: '',
      stage: 'new',
      value: 0,
      probability: 50,
      close_date: '',
      notes: '',
    })
    setErrors({})
    setIsModalOpen(true)
  }

  function handleEdit(deal: Deal) {
    setEditingDeal(deal)
    setFormData({
      organization_id: deal.organization_id,
      contact_id: deal.contact_id || '',
      name: deal.name,
      stage: deal.stage,
      value: deal.value,
      probability: deal.probability,
      close_date: deal.close_date ? deal.close_date.slice(0, 10) : '',
      notes: deal.notes || '',
    })
    setErrors({})
    setIsModalOpen(true)
  }

  function handleDelete(deal: Deal) {
    setDeleteConfirm(deal)
  }

  async function confirmDelete() {
    if (deleteConfirm) {
      await api.deals.delete(deleteConfirm.id)
      await loadData()
      setDeleteConfirm(null)
    }
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
    if (!validateForm()) return

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

    if (editingDeal) {
      await api.deals.update(editingDeal.id, data)
    } else {
      await api.deals.create(data)
    }
    await loadData()
    setIsModalOpen(false)
  }

  function handleRowClick(deal: Deal) {
    navigate(`/deals/${deal.id}`)
  }

  function clearStageFilter() {
    setStageFilter('all')
  }

  const stageVariants: Record<DealStage, 'gray' | 'blue' | 'purple' | 'amber' | 'green' | 'red'> = {
    new: 'gray', qualified: 'blue', proposal: 'purple', negotiation: 'amber', won: 'green', lost: 'red'
  }

  const columns = [
    dealColumnHelper.accessor('name', {
      header: 'Deal Name',
      cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
    }),
    dealColumnHelper.display({
      id: 'organization',
      header: 'Organization',
      cell: (info) => {
        const org = organizations.find(o => o.id === info.row.original.organization_id)
        return org ? (
          <span className="text-brand-blue hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/organizations/${org.id}`); }}>
            {org.name}
          </span>
        ) : <span className="text-gray-400">—</span>
      },
    }),
    dealColumnHelper.display({
      id: 'contact',
      header: 'Contact',
      cell: (info) => {
        const contact = contacts.find(c => c.id === info.row.original.contact_id)
        return contact ? (
          <span className="text-gray-600">{contact.name}</span>
        ) : <span className="text-gray-400">—</span>
      },
    }),
    dealColumnHelper.accessor('stage', {
      header: 'Stage',
      cell: (info) => {
        const stage = info.getValue() as DealStage
        return <Badge variant={stageVariants[stage]} className="text-xs capitalize">{stage}</Badge>
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
dealColumnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(info.row.original); }}
            className="btn-icon text-gray-500 hover:text-brand-blue"
            aria-label="Edit deal"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(info.row.original); }}
            className="btn-icon text-gray-500 hover:text-red-600"
            aria-label="Delete deal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-500 mt-1">Track your sales opportunities</p>
        </div>
        <Button onClick={handleNew} icon={<Plus className="w-4 h-4" />}>
          Add Deal
        </Button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search deals..."
              className="input pl-10"
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search deals"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as DealStage | 'all')}
              options={[
                { value: 'all', label: 'All Stages' },
                ...STAGES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
              ]}
              className="w-40"
            />
            {stageFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={clearStageFilter} icon={<X className="w-4 h-4" />}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        data={deals}
        columns={columns}
        searchKey="name"
        onRowClick={handleRowClick}
        isLoading={isLoading}
        emptyMessage="No deals found. Click 'Add Deal' to create one."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDeal ? 'Edit Deal' : 'Add Deal'}
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
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingDeal ? 'Save Changes' : 'Create Deal'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Deal"
        message={deleteConfirm ? `Are you sure you want to delete "${deleteConfirm.name}"?` : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}