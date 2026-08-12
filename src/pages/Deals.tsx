import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeDollarSign, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";
import type { DealRow, DealInput, Organization, Contact } from "../../shared/types";
import { get, post, put, del } from "../api";
import { useFetch, useDebounced } from "../hooks";
import { useToast } from "../components/Toast";
import { Modal, ConfirmDialog } from "../components/Modal";
import { STAGES, STAGE_STYLES, fmtDate, fmtMoney, todayInput } from "../format";

export function DealsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const debounced = useDebounced(search);
  const { data, loading, reload } = useFetch<DealRow[]>(
    `/api/deals?search=${encodeURIComponent(debounced)}&stage=${stage}`
  );
  const [editing, setEditing] = useState<DealRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<DealRow | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const openForm = async (deal: DealRow | "new") => {
    setEditing(deal);
    if (orgs.length === 0) {
      const [o, c] = await Promise.all([get<Organization[]>("/api/orgs"), get<Contact[]>("/api/contacts")]);
      setOrgs(o);
      setContacts(c);
    }
  };

  const totalValue = data?.reduce((s, d) => s + d.value, 0) ?? 0;
  const totalExpected = data?.reduce((s, d) => s + Number(d.expected_value ?? 0), 0) ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Deals</h1>
          <div className="sub">The potential sales you're working on</div>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => openForm("new")}>
            <Plus size={15} /> Add deal
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input placeholder="Search deal, company or contact…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="Filter by stage"
          style={{ padding: "8px 10px", border: "1px solid var(--gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13.5, background: "#fff", color: "var(--gray-700)" }}
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="spacer" />
        {data && (
          <>
            <span className="pill"><BadgeDollarSign size={13} /> {data.length} deals</span>
            <span className="pill">Total {fmtMoney(totalValue)}</span>
            <span className="pill">Expected {fmtMoney(totalExpected)}</span>
          </>
        )}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Stage</th>
              <th className="num">Value</th>
              <th className="num">Prob.</th>
              <th className="num">Expected</th>
              <th>Close date</th>
              <th>Organization</th>
              <th>Contact</th>
              <th style={{ width: 84 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9}><div className="empty-state">Loading…</div></td></tr>
            )}
            {!loading && data && data.length === 0 && (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <SearchX size={26} />
                  <p>No deals match your search.</p>
                </div>
              </td></tr>
            )}
            {data?.map((d) => (
              <tr key={d.id} onClick={() => navigate(`/deals/${d.id}`)}>
                <td>
                  <div className="cell-main">
                    <div className="avatar">{d.name.slice(0, 1).toUpperCase()}</div>
                    <span className="name">{d.name}</span>
                  </div>
                </td>
                <td><span className={STAGE_STYLES[d.stage] ?? "badge"}>{d.stage}</span></td>
                <td className="num" style={{ fontWeight: 600, color: "var(--gray-900)" }}>{fmtMoney(d.value)}</td>
                <td className="num">{d.probability}%</td>
                <td className="num"><span style={{ color: "var(--purple-dark)", fontWeight: 600 }}>{fmtMoney(Number(d.expected_value ?? 0))}</span></td>
                <td>{fmtDate(d.close_date)}</td>
                <td>
                  {d.organization_name ? (
                    <a onClick={(e) => { e.stopPropagation(); navigate(`/organizations/${d.organization_id}`); }}>{d.organization_name}</a>
                  ) : <span className="muted">—</span>}
                </td>
                <td>
                  {d.contact_name ? (
                    <a onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${d.contact_id}`); }}>{d.contact_name}</a>
                  ) : <span className="muted">—</span>}
                </td>
                <td>
                  <div className="cell-actions">
                    <button className="icon-btn" title="Edit" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openForm(d); }}>
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" title="Delete" aria-label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(d); }}>
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
        <DealFormModal
          deal={editing === "new" ? null : editing}
          orgs={orgs}
          contacts={contacts}
          onClose={() => setEditing(null)}
          onSaved={() => { toast(editing === "new" ? "Deal added" : "Deal updated"); setEditing(null); reload(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete deal"
          message={<>Delete <strong>{deleting.name}</strong>? Its activities will also be removed.</>}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await del(`/api/deals/${deleting.id}`);
              toast("Deal deleted");
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

export function DealFormModal({
  deal,
  orgs,
  contacts,
  onClose,
  onSaved,
}: {
  deal: DealRow | null;
  orgs: Organization[];
  contacts: Contact[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(deal?.name ?? "");
  const [orgId, setOrgId] = useState<string>(deal ? String(deal.organization_id) : "");
  const [contactId, setContactId] = useState<string>(deal?.contact_id ? String(deal.contact_id) : "");
  const [stage, setStage] = useState(deal?.stage ?? "New");
  const [value, setValue] = useState(deal?.value ? String(deal.value) : "");
  const [probability, setProbability] = useState(deal?.probability ? String(deal.probability) : "0");
  const [closeDate, setCloseDate] = useState(deal?.close_date?.slice(0, 10) ?? todayInput());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const orgContacts = orgId ? contacts.filter((c) => c.organization_id === Number(orgId)) : contacts;
  const selectedOrg = orgs.find((o) => o.id === Number(orgId));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!orgId) {
      setError("Organization is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: DealInput = {
        name: name.trim(),
        organization_id: Number(orgId),
        contact_id: contactId ? Number(contactId) : null,
        stage,
        value: Number(value) || 0,
        probability: Math.min(100, Math.max(0, Number(probability) || 0)),
        close_date: closeDate || null,
      };
      if (deal) await put(`/api/deals/${deal.id}`, body);
      else await post("/api/deals", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={deal ? "Edit deal" : "Add deal"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="deal-form" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <form id="deal-form" onSubmit={submit}>
        {error && <div className="modal-error">{error}</div>}
        <div className="form-grid">
          <div className="form-field full">
            <label>Deal name <span className="req">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Enterprise License Renewal" autoFocus />
          </div>
          <div className="form-field">
            <label>Organization <span className="req">*</span></label>
            <select value={orgId} onChange={(e) => { setOrgId(e.target.value); setContactId(""); }}>
              <option value="">— Select —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Primary contact</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!orgId}>
              <option value="">{selectedOrg ? "— Choose a contact —" : "— Pick an organization first —"}</option>
              {orgContacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Close date</label>
            <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Value (USD)</label>
            <input type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="25000" />
          </div>
          <div className="form-field">
            <label>Probability (%)</label>
            <input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}