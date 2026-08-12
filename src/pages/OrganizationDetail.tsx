import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Pencil, Plus, Trash2 } from "lucide-react";
import type { ContactRow, DealRow } from "../../shared/types";
import { del } from "../api";
import { useFetch } from "../hooks";
import { useToast } from "../components/Toast";
import { ConfirmDialog } from "../components/Modal";
import { OrgFormModal } from "./Organizations";
import { STAGE_STYLES, STATUS_STYLES, fmtDate, fmtMoney, initials } from "../format";

type OrgDetail = {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  created_at: string;
  contacts: ContactRow[];
  deals: DealRow[];
};

export function OrganizationDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, reload } = useFetch<OrgDetail>(`/api/orgs/${id}`);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return <div className="page"><div className="empty-state">Loading…</div></div>;
  }
  if (!data) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Organization not found.</p>
          <Link to="/organizations">Back to organizations</Link>
        </div>
      </div>
    );
  }

  const o = data;

  return (
    <div className="page">
      <div className="detail-head">
        <button className="back-btn" onClick={() => navigate("/organizations")} aria-label="Back">
          <ArrowLeft size={17} />
        </button>
        <div className="avatar-lg org">{o.name.slice(0, 1).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{o.name}</h1>
          <div className="head-meta">
            {o.industry ?? "No industry"}
            {o.website && <> · <a href={`https://${o.website}`} target="_blank" rel="noreferrer" className="link-icon"><Globe size={12} /> {o.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></>}
            {" · "}Added {fmtDate(o.created_at)}
          </div>
        </div>
        <div className="page-head-actions" style={{ marginBottom: 0 }}>
          <button className="btn" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
          <button className="btn btn-danger" onClick={() => setDeleting(true)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>

      {o.notes && (
        <div className="detail-card" style={{ marginBottom: 18 }}>
          <h3>Notes</h3>
          <div className="notes-box">{o.notes}</div>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-card">
          <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Contacts <span className="count-chip">{o.contacts.length}</span>
          </h3>
          {o.contacts.length === 0 ? (
            <p className="feed-empty">No contacts at this organization.</p>
          ) : (
            <table className="mini-table" style={{ width: "100%" }}>
              <tbody>
                {o.contacts.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/contacts/${c.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(c.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{c.job_title ?? "\u00a0"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <span className={STATUS_STYLES[c.status] ?? "badge"}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="btn btn-sm mt-16" onClick={() => navigate("/contacts")} style={{ width: "100%", justifyContent: "center" }}>
            <Plus size={13} /> Add contact
          </button>
        </div>

        <div className="detail-card">
          <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Deals <span className="count-chip">{o.deals.length}</span>
          </h3>
          {o.deals.length === 0 ? (
            <p className="feed-empty">No deals yet.</p>
          ) : (
            <table className="mini-table" style={{ width: "100%" }}>
              <tbody>
                {o.deals.map((d) => (
                  <tr key={d.id} onClick={() => navigate(`/deals/${d.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: "var(--gray-500)" }}>closes {fmtDate(d.close_date)}</div>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <span className={STAGE_STYLES[d.stage] ?? "badge"} style={{ marginRight: 10 }}>{d.stage}</span>
                      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(d.value)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="btn btn-sm mt-16" onClick={() => navigate("/deals")} style={{ width: "100%", justifyContent: "center" }}>
            <Plus size={13} /> Add deal
          </button>
        </div>
      </div>

      {editing && (
        <OrgFormModal
          org={{ id: o.id, name: o.name, website: o.website, industry: o.industry, notes: o.notes, created_at: o.created_at, contact_count: o.contacts.length, deal_count: o.deals.length, open_deal_value: 0 }}
          onClose={() => setEditing(false)}
          onSaved={() => { toast("Organization updated"); setEditing(false); reload(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete organization"
          message={<>Delete <strong>{o.name}</strong>? This also removes its deals. Contacts will be kept but unlinked.</>}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            try {
              await del(`/api/orgs/${o.id}`);
              toast("Organization deleted");
              navigate("/organizations");
            } catch (e) {
              toast(e instanceof Error ? e.message : "Failed to delete");
            }
          }}
        />
      )}
    </div>
  );
}