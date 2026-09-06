import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, Loader2 } from 'lucide-react'
import { cn } from '../utils/helpers'

export interface CellInfo<T> {
  getValue: <V = unknown>() => V | undefined
  row: { original: T }
}

export interface ColumnDef<T> {
  header: string
  accessorKey?: keyof T | string
  cell?: (info: CellInfo<T>) => React.ReactNode
  enableSorting?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchKey?: keyof T | string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  searchKey,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No records found',
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')

  const filteredData = useMemo(() => {
    let result = [...data]

    if (globalFilter && searchKey) {
      const searchTerm = globalFilter.toLowerCase()
      result = result.filter((row) => {
        const value = row[searchKey as keyof T]
        return String(value).toLowerCase().includes(searchTerm)
      })
    }

    if (sorting) {
      result.sort((a, b) => {
        const aVal = a[sorting.id as keyof T]
        const bVal = b[sorting.id as keyof T]
        const comparison = String(aVal).localeCompare(String(bVal))
        return sorting.desc ? -comparison : comparison
      })
    }

    return result
  }, [data, globalFilter, searchKey, sorting])

  const handleSort = (columnId: string) => {
    setSorting((prev) => {
      if (prev?.id === columnId) {
        return { id: columnId, desc: !prev.desc }
      }
      return { id: columnId, desc: false }
    })
  }

  return (
    <div className={cn('table-container', className)}>
      {searchKey && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="input pl-10"
              aria-label="Search"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table" role="grid">
          <thead>
            <tr>
              {columns.map((column, colIndex) => (
                <th
                  key={colIndex}
                  className={cn(
                    column.enableSorting && 'cursor-pointer select-none hover:bg-gray-100',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => column.enableSorting && column.accessorKey && handleSort(column.accessorKey as string)}
                  style={{ width: column.accessorKey ? undefined : 'auto' }}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {column.enableSorting && column.accessorKey && (
                      <span className="inline-flex">
                        {sorting?.id === column.accessorKey && sorting.desc ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : sorting?.id === column.accessorKey && !sorting.desc ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-300" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-gray-50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIndex) => (
                    <td key={colIndex}>
                      {column.cell
                        ? column.cell({
                            getValue: <V = unknown>() => column.accessorKey ? row[column.accessorKey as keyof T] as V : undefined,
                            row: { original: row },
                          })
                        : column.accessorKey
                        ? String(row[column.accessorKey as keyof T] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
        Showing {filteredData.length} of {data.length} results
      </div>
    </div>
  )
}

export function createColumnHelper<T>() {
  return {
    accessor: (key: keyof T | string, options: { header: string; cell?: (info: CellInfo<T>) => React.ReactNode; enableSorting?: boolean }) => ({
      accessorKey: key,
      header: options.header,
      cell: options.cell,
      enableSorting: options.enableSorting ?? true,
    }),
    display: (options: { id: string; header: string; cell: (info: CellInfo<T>) => React.ReactNode; enableSorting?: boolean }) => ({
      accessorKey: options.id,
      header: options.header,
      cell: options.cell,
      enableSorting: options.enableSorting ?? false,
    }),
  }
}