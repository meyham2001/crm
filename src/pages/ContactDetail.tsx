import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Mail, Pencil, Phone, Trash2, BadgeDollarSign } from "lucide-react";
import type { ContactRow, DealRow, ActivityRow, Organization } from "../../shared/types";
import { del, get } from "../api";
import { useFetch } from "../hooks";
import { useToast } from "../components/Toast";
import { ConfirmDialog } from "../components/Modal";
import { ActivityForm, ActivityTimeline } from "../components/Activity";
import { STATUS_STYLES, STAGE_STYLES, fmtMoney, fmtDate, initials } from "../format";
import { ContactFormModal } from "./Contacts";

type ContactDetail = ContactRow & { deals: DealRow[]; activities: ActivityRow[] };

export function ContactDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, reload } = useFetch<ContactDetail>(`/api/contacts/${id}`);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const openEdit = async () => {
    setEditing(true);
    if (orgs.length === 0) setOrgs(await get<Organization[]>("/api/orgs"));
  };

  if (loading) {
    return <div className="page"><div className="empty-state">Loading…</div></div>;
  }
  if (!data) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Contact not found.</p>
          <Link to="/contacts">Back to contacts</Link>
        </div>
      </div>
    );
  }

  const c = data;

  return (
    <div className="page">
      <div className="detail-head">
        <button className="back-btn" onClick={() => navigate("/contacts")} aria-label="Back">
          <ArrowLeft size={17} />
        </button>
        <div className="avatar-lg">{initials(c.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{c.name}</h1>
          <div className="head-meta">
            {c.job_title && <span>{c.job_title} · </span>}
            {c.organization_name ? (
              <Link to={`/organizations/${c.organization_id}`}>{c.organization_name}</Link>
            ) : (
              "No organization"
            )}
            {" · "}
            <span className={STATUS_STYLES[c.status] ?? "badge"}>{c.status}</span>
          </div>
        </div>
        <div className="page-head-actions" style={{ marginBottom: 0 }}>
          <button className="btn" onClick={openEdit}><Pencil size={14} /> Edit</button>
          <button className="btn btn-danger" onClick={() => setDeleting(true)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Details</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="k">Email</div>
              <div className="v">{c.email ? <a href={`mailto:${c.email}`} className="link-icon"><Mail size={13} /> {c.email}</a> : "—"}</div>
            </div>
            <div className="info-item">
              <div className="k">Phone</div>
              <div className="v">{c.phone ? <a href={`tel:${c.phone}`} className="link-icon"><Phone size={13} /> {c.phone}</a> : "—"}</div>
            </div>
            <div className="info-item">
              <div className="k">Organization</div>
              <div className="v">{c.organization_name ? <Link to={`/organizations/${c.organization_id}`} className="link-icon"><Building2 size={13} /> {c.organization_name}</Link> : "—"}</div>
            </div>
            <div className="info-item">
              <div className="k">Job title</div>
              <div className="v">{c.job_title ?? "—"}</div>
            </div>
            <div className="info-item">
              <div className="k">Status</div>
              <div className="v"><span className={STATUS_STYLES[c.status] ?? "badge"}>{c.status}</span></div>
            </div>
            <div className="info-item">
              <div className="k">Added</div>
              <div className="v">{fmtDate(c.created_at)}</div>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Deals
            <Link to="/deals" style={{ fontSize: 12, textTransform: "none", letterSpacing: 0 }} className="link-icon">
              <BadgeDollarSign size={13} /> All deals
            </Link>
          </h3>
          {c.deals.length === 0 ? (
            <p className="feed-empty">No deals with this contact yet.</p>
          ) : (
            <table className="mini-table" style={{ width: "100%" }}>
              <tbody>
                {c.deals.map((d) => (
                  <tr key={d.id} onClick={() => navigate(`/deals/${d.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{d.organization_name}</div>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <span className={STAGE_STYLES[d.stage] ?? "badge"} style={{ marginRight: 10 }}>{d.stage}</span>
                      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(d.value)}</span>
                      <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 1 }}>{fmtDate(d.close_date)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="detail-card">
        <h3>Activity</h3>
        <ActivityForm contactId={c.id} onAdded={reload} />
        <div className="mt-16">
          <ActivityTimeline activities={c.activities} onChanged={reload} emptyText="Nothing logged yet. Add your first note, call or email above." />
        </div>
      </div>

      {editing && (
        <ContactFormModal
          contact={c}
          orgs={orgs}
          onClose={() => setEditing(false)}
          onSaved={() => { toast("Contact updated"); setEditing(false); reload(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete contact"
          message={<>Delete <strong>{c.name}</strong> and all of their activities?</>}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            try {
              await del(`/api/contacts/${c.id}`);
              toast("Contact deleted");
              navigate("/contacts");
            } catch (e) {
              toast(e instanceof Error ? e.message : "Failed to delete");
            }
          }}
        />
      )}
    </div>
  );
}