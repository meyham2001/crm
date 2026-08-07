import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from "lucide-react";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right";
  }
}

/** Sortable header cell helper. */
export function sortHeader<T>(label: string) {
  return ({ column }: { column: any }) => {
    const sorted = column.getIsSorted();
    return (
      <button className="th-sort" onClick={() => column.toggleSorting(sorted === "asc")}>
        {label}
        {sorted === "asc" ? (
          <ArrowUp size={12} />
        ) : sorted === "desc" ? (
          <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={12} className="dim" />
        )}
      </button>
    );
  };
}

export function DataTable<TData>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No records found.",
  initialSorting = []
}: {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  initialSorting?: SortingState;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="table-card">
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className={header.column.columnDef.meta?.align === "right" ? "align-right" : undefined}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={onRowClick ? "clickable" : undefined}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={cell.column.columnDef.meta?.align === "right" ? "align-right" : undefined}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="table-empty">
          <Inbox size={26} style={{ marginBottom: 8, color: "var(--border-strong)" }} />
          <div>{emptyMessage}</div>
        </div>
      )}
    </div>
  );
}
