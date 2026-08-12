import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Pencil, Plus, Search, SearchX, Trash2, Globe } from "lucide-react";
import type { OrganizationRow, OrganizationInput } from "../../shared/types";
import { post, put, del } from "../api";
import { useFetch, useDebounced } from "../hooks";
import { useToast } from "../components/Toast";
import { Modal, ConfirmDialog } from "../components/Modal";
import { fmtMoney } from "../format";

export function OrganizationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const { data, loading, reload } = useFetch<OrganizationRow[]>(`/api/orgs?search=${encodeURIComponent(debounced)}`);
  const [editing, setEditing] = useState<OrganizationRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<OrganizationRow | null>(null);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Organizations</h1>
          <div className="sub">The companies you do business with</div>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={15} /> Add organization
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input placeholder="Search name, industry or website…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="spacer" />
        {data && <span className="pill"><Building2 size={13} /> {data.length} organizations</span>}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Industry</th>
              <th>Website</th>
              <th className="num">Contacts</th>
              <th className="num">Deals</th>
              <th className="num">Open value</th>
              <th style={{ width: 84 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7}><div className="empty-state">Loading…</div></td></tr>
            )}
            {!loading && data && data.length === 0 && (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <SearchX size={26} />
                  <p>No organizations match your search.</p>
                </div>
              </td></tr>
            )}
            {data?.map((o) => (
              <tr key={o.id} onClick={() => navigate(`/organizations/${o.id}`)}>
                <td>
                  <div className="cell-main">
                    <div className="avatar org">{o.name.slice(0, 1).toUpperCase()}</div>
                    <span className="name">{o.name}</span>
                  </div>
                </td>
                <td>{o.industry ?? <span className="muted">—</span>}</td>
                <td>
                  {o.website ? (
                    <a href={`https://${o.website}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="link-icon">
                      <Globe size={13} /> {o.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="num">{o.contact_count}</td>
                <td className="num">{o.deal_count}</td>
                <td className="num">{fmtMoney(o.open_deal_value)}</td>
                <td>
                  <div className="cell-actions">
                    <button className="icon-btn" title="Edit" aria-label="Edit" onClick={(e) => { e.stopPropagation(); setEditing(o); }}>
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" title="Delete" aria-label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(o); }}>
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
        <OrgFormModal
          org={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { toast(editing === "new" ? "Organization added" : "Organization updated"); setEditing(null); reload(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete organization"
          message={
            <>
              Delete <strong>{deleting.name}</strong>? This also removes its deals.
              Contacts will be kept but unlinked.
            </>
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await del(`/api/orgs/${deleting.id}`);
              toast("Organization deleted");
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

export function OrgFormModal({
  org,
  onClose,
  onSaved,
}: {
  org: OrganizationRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(org?.name ?? "");
  const [website, setWebsite] = useState(org?.website ?? "");
  const [industry, setIndustry] = useState(org?.industry ?? "");
  const [notes, setNotes] = useState(org?.notes ?? "");
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
      const body: OrganizationInput = { name: name.trim(), website: website.trim() || null, industry: industry.trim() || null, notes: notes.trim() || null };
      if (org) await put(`/api/orgs/${org.id}`, body);
      else await post("/api/orgs", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={org ? "Edit organization" : "Add organization"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="org-form" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <form id="org-form" onSubmit={submit}>
        {error && <div className="modal-error">{error}</div>}
        <div className="form-grid">
          <div className="form-field full">
            <label>Name <span className="req">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corporation" autoFocus />
          </div>
          <div className="form-field">
            <label>Website</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="acme.com" />
          </div>
          <div className="form-field">
            <label>Industry</label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. SaaS" />
          </div>
          <div className="form-field full">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this company…" />
          </div>
        </div>
      </form>
    </Modal>
  );
}