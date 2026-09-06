import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Handshake,
  GripVertical,
  Target,
  TrendingUp,
} from 'lucide-react'
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../api/client'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { Select } from '../components/Select'
import { formatCurrency, formatDate } from '../utils/helpers'
import { cn } from '../utils/helpers'
import type { Deal, DealStage, Organization, Contact } from '../types'
import { CheckCircle, XCircle, FileText, Calendar } from 'lucide-react'

const STAGES: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

const STAGE_LABELS: Record<DealStage, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

const STAGE_COLORS: Record<DealStage, string> = {
  new: 'gray',
  qualified: 'blue',
  proposal: 'purple',
  negotiation: 'amber',
  won: 'green',
  lost: 'red',
}

const STAGE_ICONS: Record<DealStage, React.ComponentType<{ className?: string }>> = {
  new: Target,
  qualified: Handshake,
  proposal: FileText,
  negotiation: TrendingUp,
  won: CheckCircle,
  lost: XCircle,
}

interface SortableDealCardProps {
  deal: Deal
  organizations: Organization[]
  contacts: Contact[]
  onClick: (deal: Deal) => void
}

function SortableDealCard({ deal, organizations, contacts, onClick }: SortableDealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const org = organizations.find(o => o.id === deal.organization_id)
  const contact = deal.contact_id ? contacts.find(c => c.id === deal.contact_id) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'card p-4 cursor-pointer hover:shadow-md transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-brand-amber'
      )}
      {...attributes}
      {...listeners}
      onClick={() => onClick(deal)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{deal.name}</h4>
          <p className="text-sm text-gray-500 truncate">{org?.name || 'Unknown'}</p>
        </div>
        <GripVertical className="w-5 h-5 text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-900">{formatCurrency(deal.value)}</span>
        <Badge variant={STAGE_COLORS[deal.stage] as any} className="capitalize">{deal.stage}</Badge>
      </div>
      {deal.close_date && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(deal.close_date)}
        </p>
      )}
      {contact && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <Avatar name={contact.name} size="sm" className="w-4 h-4" />
          {contact.name}
        </p>
      )}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>{deal.probability}% probability</span>
        <span>{formatCurrency(deal.value * deal.probability / 100)} expected</span>
      </div>
    </div>
  )
}

export function Pipeline() {
  const navigate = useNavigate()
  const [dealsByStage, setDealsByStage] = useState<Record<DealStage, Deal[]>>({} as Record<DealStage, Deal[]>)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const [orgs, conts, deals] = await Promise.all([
        api.organizations.list(),
        api.contacts.list(),
        api.deals.list(),
      ])
      setOrganizations(orgs)
      setContacts(conts)
      const pipelineData: Record<DealStage, Deal[]> = {
        new: [],
        qualified: [],
        proposal: [],
        negotiation: [],
        won: [],
        lost: [],
      }
      for (const deal of deals) {
        if (pipelineData[deal.stage]) {
          pipelineData[deal.stage].push(deal)
        }
      }
      setDealsByStage(pipelineData)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dealId = active.id as string
    const newStage = over.id as DealStage
    let currentDeal: Deal | undefined
    for (const stage of STAGES) {
      const found = dealsByStage[stage]?.find(d => d.id === dealId)
      if (found) {
        currentDeal = found
        break
      }
    }
    if (!currentDeal) return

    if (currentDeal.stage !== newStage) {
      await api.deals.updateStage(dealId, newStage)
      await loadData()
    }
  }

  function handleNew() {
    setEditingDeal(null)
    setFormData({
      organization_id: '',
      contact_id: '',
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

  const stageOrder = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as DealStage[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1">Drag deals between stages to update their progress</p>
        </div>
        <Button onClick={handleNew} icon={<Plus className="w-4 h-4" />}>
          Add Deal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin" role="list" aria-label="Pipeline stages">
            {stageOrder.map((stage) => {
              const deals = dealsByStage[stage] || []
              const totalValue = deals.reduce((sum, d) => sum + d.value, 0)
              const expectedRevenue = deals.reduce((sum, d) => sum + d.value * d.probability / 100, 0)
              const Icon = STAGE_ICONS[stage]

              return (
                <div
                  key={stage}
                  className="flex-shrink-0 w-80 bg-gray-50 rounded-xl border border-gray-200 min-h-[500px] flex flex-col"
                  role="listitem"
                  aria-label={`${STAGE_LABELS[stage]} stage`}
                >
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('w-5 h-5', `text-${STAGE_COLORS[stage]}-600`)} />
                      <h3 className="font-semibold text-gray-900">{STAGE_LABELS[stage]}</h3>
                    </div>
                    <Badge variant={STAGE_COLORS[stage] as any} className="text-xs">{deals.length}</Badge>
                  </div>

                  <SortableContext
                    items={deals.map(d => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px]" role="list">
                      {deals.length === 0 ? (
                        <div className="text-center text-gray-400 py-8 text-sm">
                          Drop deals here
                        </div>
                      ) : (
                        deals.map((deal) => (
                          <SortableDealCard
                            key={deal.id}
                            deal={deal}
                            organizations={organizations}
                            contacts={contacts}
                            onClick={handleRowClick}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>

                  <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total Value</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(totalValue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Expected Revenue</span>
                      <span className="font-semibold text-brand-blue">{formatCurrency(expectedRevenue)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </DndContext>
      )}

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
    </div>
  )
}