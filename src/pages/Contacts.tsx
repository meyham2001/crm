import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'
import { useOrganizations, useContacts } from '../hooks/useApi'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { Select } from '../components/Select'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { DataTable } from '../components/DataTable'
import type { Contact, ContactStatus } from '../types'

const STATUSES: ContactStatus[] = ['lead', 'qualified', 'customer']

export function Contacts() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { organizations } = useOrganizations()
  const { contacts, loading, search, create, update, delete: remove } = useContacts()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null)
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('all')
  const [formData, setFormData] = useState({
    organization_id: '',
    name: '',
    email: '',
    phone: '',
    job_title: '',
    status: 'lead' as ContactStatus,
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (statusFilter === 'all') {
      search('')
    } else {
      search('', statusFilter)
    }
  }, [statusFilter, search])

  function handleNew() {
    const orgId = searchParams.get('org')
    setEditingContact(null)
    setFormData({
      organization_id: orgId || '',
      name: '',
      email: '',
      phone: '',
      job_title: '',
      status: 'lead',
      notes: '',
    })
    setErrors({})
    setIsModalOpen(true)
  }

  function handleEdit(contact: Contact) {
    setEditingContact(contact)
    setFormData({
      organization_id: contact.organization_id || '',
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      job_title: contact.job_title || '',
      status: contact.status,
      notes: contact.notes || '',
    })
    setErrors({})
    setIsModalOpen(true)
  }

  function handleDelete(contact: Contact) {
    setDeleteConfirm(contact)
  }

  async function confirmDelete() {
    if (deleteConfirm) {
      await remove(deleteConfirm.id)
      setDeleteConfirm(null)
    }
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
    if (!validateForm()) return

    const data = {
      organization_id: formData.organization_id || null,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      job_title: formData.job_title || null,
      status: formData.status,
      notes: formData.notes || null,
    }

    if (editingContact) {
      await update(editingContact.id, data)
    } else {
      await create(data)
    }
    setIsModalOpen(false)
  }

  function handleRowClick(contact: Contact) {
    navigate(`/contacts/${contact.id}`)
  }

  function clearStatusFilter() {
    setStatusFilter('all')
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info: any) => (
        <div className="flex items-center gap-2">
          <Avatar name={info.getValue() as string} size="sm" />
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: (info: any) => info.getValue() ? (
        <a href={`mailto:${info.getValue()}`} className="text-brand-blue hover:underline text-sm">{info.getValue()}</a>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: (info: any) => info.getValue() ? <span className="text-gray-600">{info.getValue()}</span> : <span className="text-gray-400">—</span>,
    },
    {
      accessorKey: 'job_title',
      header: 'Title',
      cell: (info: any) => info.getValue() ? <span className="text-gray-600">{info.getValue()}</span> : <span className="text-gray-400">—</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info: any) => {
        const status = info.getValue() as ContactStatus
        const variants: Record<ContactStatus, 'amber' | 'blue' | 'green'> = { lead: 'amber', qualified: 'blue', customer: 'green' }
        return <Badge variant={variants[status]} className="text-xs capitalize">{status}</Badge>
      },
      enableSorting: true,
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: (info: any) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(info.row.original); }}
            className="btn-icon text-gray-500 hover:text-brand-blue"
            aria-label="Edit contact"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(info.row.original); }}
            className="btn-icon text-gray-500 hover:text-red-600"
            aria-label="Delete contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your people and relationships</p>
        </div>
        <Button onClick={handleNew} icon={<Plus className="w-4 h-4" />}>
          Add Contact
        </Button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, title..."
              className="input pl-10"
              onChange={(e) => search(e.target.value)}
              aria-label="Search contacts"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContactStatus | 'all')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'lead', label: 'Lead' },
                { value: 'qualified', label: 'Qualified' },
                { value: 'customer', label: 'Customer' },
              ]}
              className="w-40"
            />
            {statusFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={clearStatusFilter} icon={<X className="w-4 h-4" />}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        data={contacts}
        columns={columns}
        searchKey="name"
        onRowClick={handleRowClick}
        isLoading={loading}
        emptyMessage="No contacts found. Click 'Add Contact' to create one."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
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
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingContact ? 'Save Changes' : 'Create Contact'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Contact"
        message={deleteConfirm ? `Are you sure you want to delete "${deleteConfirm.name}"? This will also remove associated activities.` : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}