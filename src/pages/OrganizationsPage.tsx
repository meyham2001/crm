import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { api } from "../api";
import { useData, useDebouncedValue } from "../hooks";
import { fmtMoney, initials } from "../format";
import { errMsg, type Organization, type OrganizationRow } from "../types";
import { DataTable, sortHeader } from "../components/DataTable";
import { ErrorBanner, Loading, PageHeader, SearchInput } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { OrganizationForm } from "../components/forms";
import { useToast } from "../components/Toast";

type ModalState = { mode: "create" } | { mode: "edit"; org: OrganizationRow } | null;

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState<OrganizationRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, error, loading, reload } = useData(
    () => api<OrganizationRow[]>(`/organizations${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    [search]
  );

  const columns = useMemo<ColumnDef<OrganizationRow, any>[]>(
    () => [
      {
        header: sortHeader("Name"),
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="cell-name">
            <span className="avatar org">{initials(row.original.name)}</span>
            <span className="cell-primary">{row.original.name}</span>
          </div>
        )
      },
      {
        header: sortHeader("Industry"),
        accessorKey: "industry",
        cell: ({ getValue }) => getValue() || <span className="muted">—</span>
      },
      {
        header: "Website",
        accessorKey: "website",
        cell: ({ getValue }) => (getValue() ? <span className="secondary">{getValue()}</span> : <span className="muted">—</span>)
      },
      { header: sortHeader("Contacts"), accessorKey: "contact_count", meta: { align: "right" } },
      { header: sortHeader("Deals"), accessorKey: "deal_count", meta: { align: "right" } },
      {
        header: sortHeader("Open value"),
        accessorKey: "open_value",
        meta: { align: "right" },
        cell: ({ getValue }) => (getValue() > 0 ? fmtMoney(getValue()) : <span className="muted">—</span>)
      },
      {
        id: "actions",
        header: "",
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" title="Edit organization" onClick={() => setModal({ mode: "edit", org: row.original })}>
              <Pencil size={15} />
            </button>
            <button className="icon-btn danger" title="Delete organization" onClick={() => setDeleting(row.original)}>
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
      await api(`/organizations/${modal.org.id}`, { method: "PATCH", body: JSON.stringify(values) });
      toast("Organization updated");
    } else {
      await api("/organizations", { method: "POST", body: JSON.stringify(values) });
      toast("Organization added");
    }
    setModal(null);
    reload();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/organizations/${deleting.id}`, { method: "DELETE" });
      toast("Organization deleted");
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
      <PageHeader title="Organizations" subtitle={data ? `${data.length} ${data.length === 1 ? "company" : "companies"}` : undefined}>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search organizations…" />
        <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
          <Plus size={15} />
          Add organization
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
          onRowClick={(org) => navigate(`/organizations/${org.id}`)}
          emptyMessage={search ? `No organizations match “${search}”.` : "No organizations yet — add your first one."}
        />
      )}

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Add organization" : "Edit organization"}
          onClose={() => setModal(null)}
        >
          <OrganizationForm
            initial={modal.mode === "edit" ? modal.org : undefined}
            submitLabel={modal.mode === "create" ? "Add organization" : "Save changes"}
            onSubmit={handleSave}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete organization"
          busy={deleteBusy}
          message={
            <>
              Delete <strong>{deleting.name}</strong>? Its deals and their activities will be permanently deleted; its
              contacts will be kept without an organization.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
