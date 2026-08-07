import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { api } from "../api";
import { useData, useDebouncedValue } from "../hooks";
import { fmtDate, fmtMoney } from "../format";
import { errMsg, type Contact, type DealRow, type Organization } from "../types";
import { DataTable, sortHeader } from "../components/DataTable";
import { ErrorBanner, Loading, PageHeader, SearchInput } from "../components/ui";
import { StageBadge } from "../components/Badges";
import { ConfirmDialog, Modal } from "../components/Modal";
import { DealForm } from "../components/forms";
import { useToast } from "../components/Toast";

type ModalState = { mode: "create" } | { mode: "edit"; deal: DealRow } | null;

export default function DealsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState<DealRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, error, loading, reload } = useData(
    () => api<DealRow[]>(`/deals${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    [search]
  );
  const { data: organizations } = useData(() => api<Organization[]>("/organizations"), [modal !== null]);
  const { data: contacts } = useData(() => api<Contact[]>("/contacts"), [modal !== null]);

  const columns = useMemo<ColumnDef<DealRow, any>[]>(
    () => [
      {
        header: sortHeader("Deal"),
        accessorKey: "name",
        cell: ({ row }) => (
          <div>
            <div className="cell-primary" style={{ fontWeight: 600 }}>
              {row.original.name}
            </div>
            <div className="cell-sub">{row.original.contact_name ?? "No contact"}</div>
          </div>
        )
      },
      {
        header: sortHeader("Stage"),
        accessorKey: "stage",
        cell: ({ getValue }) => <StageBadge stage={getValue()} />
      },
      {
        header: sortHeader("Value"),
        accessorKey: "value",
        meta: { align: "right" },
        cell: ({ getValue }) => <strong>{fmtMoney(getValue())}</strong>
      },
      {
        header: sortHeader("Probability"),
        accessorKey: "probability",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="secondary">{getValue()}%</span>
      },
      {
        header: sortHeader("Close date"),
        accessorKey: "close_date",
        cell: ({ getValue }) => <span className="secondary">{fmtDate(getValue())}</span>
      },
      {
        header: sortHeader("Organization"),
        accessorKey: "organization_name",
        cell: ({ getValue }) => getValue() ?? <span className="muted">—</span>
      },
      {
        id: "actions",
        header: "",
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" title="Edit deal" onClick={() => setModal({ mode: "edit", deal: row.original })}>
              <Pencil size={15} />
            </button>
            <button className="icon-btn danger" title="Delete deal" onClick={() => setDeleting(row.original)}>
              <Trash2 size={15} />
            </button>
          </div>
        )
      }
    ],
    []
  );

  async function handleSave(values: any) {
    if (modal?.mode === "edit") {
      await api(`/deals/${modal.deal.id}`, { method: "PATCH", body: JSON.stringify(values) });
      toast("Deal updated");
    } else {
      await api("/deals", { method: "POST", body: JSON.stringify(values) });
      toast("Deal added");
    }
    setModal(null);
    reload();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/deals/${deleting.id}`, { method: "DELETE" });
      toast("Deal deleted");
      setDeleting(null);
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Deals" subtitle={data ? `${data.length} ${data.length === 1 ? "deal" : "deals"}` : undefined}>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search deals…" />
        <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
          <Plus size={15} />
          Add deal
        </button>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBanner message={error} onRetry={reload} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          onRowClick={(d) => navigate(`/deals/${d.id}`)}
          emptyMessage={search ? `No deals match “${search}”.` : "No deals yet — add your first one."}
        />
      )}

      {modal && (
        <Modal title={modal.mode === "create" ? "Add deal" : "Edit deal"} onClose={() => setModal(null)} width={600}>
          <DealForm
            initial={modal.mode === "edit" ? modal.deal : undefined}
            organizations={organizations ?? []}
            contacts={contacts ?? []}
            submitLabel={modal.mode === "create" ? "Add deal" : "Save changes"}
            onSubmit={handleSave}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete deal"
          busy={deleteBusy}
          message={
            <>
              Delete <strong>{deleting.name}</strong>? Its activities will be permanently deleted. This cannot be
              undone.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
