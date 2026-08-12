import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Pencil, Plus, Search, SearchX, Trash2, Users } from "lucide-react";
import type { ContactRow, ContactInput, Organization } from "../../shared/types";
import { get, post, put, del } from "../api";
import { useFetch, useDebounced } from "../hooks";
import { useToast } from "../components/Toast";
import { Modal, ConfirmDialog } from "../components/Modal";
import { STATUS_STYLES, initials } from "../format";

export function ContactsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const debounced = useDebounced(search);
  const { data, loading, reload } = useFetch<ContactRow[]>(
    `/api/contacts?search=${encodeURIComponent(debounced)}&status=${status}`
  );
  const [editing, setEditing] = useState<ContactRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ContactRow | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const openForm = async (contact: ContactRow | "new") => {
    setEditing(contact);
    if (orgs.length === 0) {
      setOrgs(await get<Organization[]>("/api/orgs"));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Contacts</h1>
          <div className="sub">The people you deal with</div>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => openForm("new")}>
            <Plus size={15} /> Add contact
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input placeholder="Search name, email, title or company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          style={{ padding: "8px 10px", border: "1px solid var(--gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13.5, background: "#fff", color: "var(--gray-700)" }}
        >
          <option value="all">All statuses</option>
          <option value="lead">Lead</option>
          <option value="qualified">Qualified</option>
          <option value="customer">Customer</option>
        </select>
        <div className="spacer" />
        {data && <span className="pill"><Users size={13} /> {data.length} contacts</span>}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Organization</th>
              <th>Job title</th>
              <th>Status</th>
              <th style={{ width: 84 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6}><div className="empty-state">Loading…</div></td></tr>
            )}
            {!loading && data && data.length === 0 && (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <SearchX size={26} />
                  <p>No contacts match your search.</p>
                </div>
              </td></tr>
            )}
            {data?.map((c) => (
              <tr key={c.id} onClick={() => navigate(`/contacts/${c.id}`)}>
                <td>
                  <div className="cell-main">
                    <div className="avatar">{initials(c.name)}</div>
                    <span className="name">{c.name}</span>
                  </div>
                </td>
                <td>
                  {c.email ? (
                    <a className="link-icon" href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}>
                      <Mail size={13} /> {c.email}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {c.organization_name ? (
                    <a onClick={(e) => { e.stopPropagation(); navigate(`/organizations/${c.organization_id}`); }}>
                      {c.organization_name}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{c.job_title ?? <span className="muted">—</span>}</td>
                <td>
                  <span className={STATUS_STYLES[c.status] ?? "badge"}>{c.status}</span>
                </td>
                <td>
                  <div className="cell-actions">
                    <button className="icon-btn" title="Edit" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openForm(c); }}>
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" title="Delete" aria-label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(c); }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ContactFormModal
          contact={editing === "new" ? null : editing}
          orgs={orgs}
          onClose={() => setEditing(null)}
          onSaved={() => { toast(editing === "new" ? "Contact added" : "Contact updated"); setEditing(null); reload(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete contact"
          message={<>Delete <strong>{deleting.name}</strong>? Their activities will also be removed.</>}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await del(`/api/contacts/${deleting.id}`);
              toast("Contact deleted");
              setDeleting(null);
              reload();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Failed to delete");
            }
          }}
        />
      )}
    </div>
  );
}

export function ContactFormModal({
  contact,
  orgs,
  onClose,
  onSaved,
}: {
  contact: ContactRow | null;
  orgs: Organization[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(contact?.job_title ?? "");
  const [orgId, setOrgId] = useState<string>(contact?.organization_id ? String(contact.organization_id) : "");
  const [status, setStatus] = useState(contact?.status ?? "lead");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: ContactInput = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        job_title: jobTitle.trim() || null,
        organization_id: orgId ? Number(orgId) : null,
        status,
      };
      if (contact) await put(`/api/contacts/${contact.id}`, body);
      else await post("/api/contacts", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={contact ? "Edit contact" : "Add contact"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="contact-form" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <form id="contact-form" onSubmit={submit}>
        {error && <div className="modal-error">{error}</div>}
        <div className="form-grid">
          <div className="form-field full">
            <label>Name <span className="req">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Smith" autoFocus />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>
          <div className="form-field">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          </div>
          <div className="form-field">
            <label>Job title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. VP Sales" />
          </div>
          <div className="form-field">
            <label>Organization</label>
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">— None —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="lead">Lead</option>
              <option value="qualified">Qualified</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}