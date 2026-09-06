import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { useOrganizations } from '../hooks/useApi'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import type { Organization } from '../types'

export function Organizations() {
  const navigate = useNavigate()
  const { organizations, loading, search, create, update, delete: remove } = useOrganizations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Organization | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNew() {
    setEditingOrg(null)
    setFormData({ name: '', website: '', industry: '', notes: '' })
    setErrors({})
    setIsModalOpen(true)
  }

  function handleEdit(org: Organization) {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      website: org.website || '',
      industry: org.industry || '',
      notes: org.notes || '',
    })
    setErrors({})
    setIsModalOpen(true)
  }

  function handleDelete(org: Organization) {
    setDeleteConfirm(org)
  }

  async function confirmDelete() {
    if (deleteConfirm) {
      await remove(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'Please enter a valid URL'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return

    if (editingOrg) {
      await update(editingOrg.id, formData)
    } else {
      await create(formData)
    }
    setIsModalOpen(false)
  }

  function handleRowClick(org: Organization) {
    navigate(`/organizations/${org.id}`)
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info: any) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
      enableSorting: true,
    },
    {
      accessorKey: 'website',
      header: 'Website',
      cell: (info: any) => info.getValue() ? (
        <a href={info.getValue() as string} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline text-sm">
          {(info.getValue() as string).replace(/^https?:\/\//, '')}
        </a>
      ) : (
        <span className="text-gray-400">—</span>
      ),
    },
    {
      accessorKey: 'industry',
      header: 'Industry',
      cell: (info: any) => info.getValue() ? (
        <Badge variant="blue" className="text-xs">{info.getValue()}</Badge>
      ) : (
        <span className="text-gray-400">—</span>
      ),
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: (info: any) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(info.row.original); }}
            className="btn-icon text-gray-500 hover:text-brand-blue"
            aria-label="Edit organization"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(info.row.original); }}
            className="btn-icon text-gray-500 hover:text-red-600"
            aria-label="Delete organization"
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
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-500 mt-1">Manage your companies and accounts</p>
        </div>
        <Button onClick={handleNew} icon={<Plus className="w-4 h-4" />}>
          Add Organization
        </Button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by name, website, industry..."
            className="input pl-10"
            onChange={(e) => search(e.target.value)}
            aria-label="Search organizations"
          />
        </div>
      </div>

      <DataTable
        data={organizations}
        columns={columns}
        searchKey="name"
        onRowClick={handleRowClick}
        isLoading={loading}
        emptyMessage="No organizations found. Click 'Add Organization' to create one."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOrg ? 'Edit Organization' : 'Add Organization'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Name"
            name="name"
            required
            error={errors.name}
            children={
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            }
          />
          <FormField
            label="Website"
            name="website"
            placeholder="https://example.com"
            children={
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            }
          />
          <FormField
            label="Industry"
            name="industry"
            placeholder="Technology"
            children={
              <Input
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Technology"
              />
            }
          />
          <FormField
            label="Notes"
            name="notes"
            children={
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            }
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingOrg ? 'Save Changes' : 'Create Organization'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Organization"
        message={deleteConfirm ? `Are you sure you want to delete "${deleteConfirm.name}"? This will also remove associated contacts and deals.` : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}