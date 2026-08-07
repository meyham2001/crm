import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { api } from "../api";
import { useData, useDebouncedValue } from "../hooks";
import { initials } from "../format";
import { errMsg, STATUS_LABEL, type ContactRow, type ContactStatus, type Organization } from "../types";
import { DataTable, sortHeader } from "../components/DataTable";
import { ErrorBanner, Loading, PageHeader, SearchInput } from "../components/ui";
import { StatusBadge } from "../components/Badges";
import { ConfirmDialog, Modal } from "../components/Modal";
import { ContactForm } from "../components/forms";
import { useToast } from "../components/Toast";

type ModalState = { mode: "create" } | { mode: "edit"; contact: ContactRow } | null;

const STATUS_FILTERS: { value: ContactStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "lead", label: "Leads" },
  { value: "qualified", label: "Qualified" },
  { value: "customer", label: "Customers" }
];

export default function ContactsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [status, setStatus] = useState<ContactStatus | "">("");
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState<ContactRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [search, status]);

  const { data, error, loading, reload } = useData(() => api<ContactRow[]>(`/contacts${query}`), [query]);
  const { data: organizations } = useData(() => api<Organization[]>("/organizations"), [modal !== null]);

  const columns = useMemo<ColumnDef<ContactRow, any>[]>(
    () => [
      {
        header: sortHeader("Name"),
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="cell-name">
            <span className="avatar">{initials(row.original.name)}</span>
            <div>
              <div className="cell-primary">{row.original.name}</div>
              {row.original.title && <div className="cell-sub">{row.original.title}</div>}
            </div>
          </div>
        )
      },
      {
        header: sortHeader("Organization"),
        accessorKey: "organization_name",
        cell: ({ getValue }) => getValue() ?? <span className="muted">—</span>
      },
      {
        header: sortHeader("Email"),
        accessorKey: "email",
        cell: ({ getValue }) => (getValue() ? <span className="secondary">{getValue()}</span> : <span className="muted">—</span>)
      },
      {
        header: "Phone",
        accessorKey: "phone",
        cell: ({ getValue }) => (getValue() ? <span className="secondary">{getValue()}</span> : <span className="muted">—</span>)
      },
      {
        header: sortHeader("Status"),
        accessorKey: "status",
        cell: ({ getValue }) => <StatusBadge status={getValue()} />
      },
      {
        id: "actions",
        header: "",
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" title="Edit contact" onClick={() => setModal({ mode: "edit", contact: row.original })}>
              <Pencil size={15} />
            </button>
            <button className="icon-btn danger" title="Delete contact" onClick={() => setDeleting(row.original)}>
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
      await api(`/contacts/${modal.contact.id}`, { method: "PATCH", body: JSON.stringify(values) });
      toast("Contact updated");
    } else {
      await api("/contacts", { method: "POST", body: JSON.stringify(values) });
      toast("Contact added");
    }
    setModal(null);
    reload();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/contacts/${deleting.id}`, { method: "DELETE" });
      toast("Contact deleted");
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
      <PageHeader title="Contacts" subtitle={data ? `${data.length} ${data.length === 1 ? "person" : "people"}` : undefined}>
        <div className="segmented" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} className={status === f.value ? "active" : ""} onClick={() => setStatus(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by name, email or title…" />
        <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
          <Plus size={15} />
          Add contact
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
          onRowClick={(c) => navigate(`/contacts/${c.id}`)}
          emptyMessage={
            search || status
              ? `No contacts match${search ? ` “${search}”` : ""}${status ? ` (${STATUS_LABEL[status]})` : ""}.`
              : "No contacts yet — add your first one."
          }
        />
      )}

      {modal && (
        <Modal title={modal.mode === "create" ? "Add contact" : "Edit contact"} onClose={() => setModal(null)}>
          <ContactForm
            initial={modal.mode === "edit" ? modal.contact : undefined}
            organizations={organizations ?? []}
            submitLabel={modal.mode === "create" ? "Add contact" : "Save changes"}
            onSubmit={handleSave}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete contact"
          busy={deleteBusy}
          message={
            <>
              Delete <strong>{deleting.name}</strong>? Their activities will be permanently deleted. Deals they are
              linked to will be kept without a primary contact.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
