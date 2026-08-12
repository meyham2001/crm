import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { DealRow, ActivityRow, Organization, Contact } from "../../shared/types";
import { del, get, patch } from "../api";
import { useFetch } from "../hooks";
import { useToast } from "../components/Toast";
import { ConfirmDialog } from "../components/Modal";
import { ActivityForm, ActivityTimeline } from "../components/Activity";
import { DealFormModal } from "./Deals";
import { STAGES, STAGE_STYLES, fmtDate, fmtMoney } from "../format";

type DealDetail = DealRow & { activities: ActivityRow[] };

export function DealDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, reload } = useFetch<DealDetail>(`/api/deals/${id}`);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const openEdit = async () => {
    setEditing(true);
    if (orgs.length === 0) {
      const [o, c] = await Promise.all([get<Organization[]>("/api/orgs"), get<Contact[]>("/api/contacts")]);
      setOrgs(o);
      setContacts(c);
    }
  };

  const moveStage = async (stage: string) => {
    if (!data || stage === data.stage) return;
    try {
      await patch(`/api/deals/${data.id}`, { stage });
      toast(`Moved to ${stage}`);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update stage");
    }
  };

  if (loading) {
    return <div className="page"><div className="empty-state">Loading…</div></div>;
  }
  if (!data) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Deal not found.</p>
          <Link to="/deals">Back to deals</Link>
        </div>
      </div>
    );
  }

  const d = data;

  return (
    <div className="page">
      <div className="detail-head">
        <button className="back-btn" onClick={() => navigate("/deals")} aria-label="Back">
          <ArrowLeft size={17} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{d.name}</h1>
          <div className="head-meta">
            <span className={STAGE_STYLES[d.stage] ?? "badge"} style={{ marginRight: 8 }}>{d.stage}</span>
            {d.organization_name && <Link to={`/organizations/${d.organization_id}`}>{d.organization_name}</Link>}
            {d.contact_name && (
              <>
                {" · "}
                <Link to={`/contacts/${d.contact_id}`}>{d.contact_name}</Link>
              </>
            )}
          </div>
        </div>
        <div className="page-head-actions" style={{ marginBottom: 0 }}>
          <button className="btn" onClick={openEdit}><Pencil size={14} /> Edit</button>
          <button className="btn btn-danger" onClick={() => setDeleting(true)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Deal details</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="k">Value</div>
              <div className="v" style={{ fontSize: 17, fontWeight: 700 }}>{fmtMoney(d.value)}</div>
            </div>
            <div className="info-item">
              <div className="k">Expected value</div>
              <div className="v" style={{ color: "var(--purple-dark)", fontWeight: 600 }}>{fmtMoney(Number(d.expected_value ?? 0))}</div>
            </div>
            <div className="info-item">
              <div className="k">Probability</div>
              <div className="v">{d.probability}%</div>
            </div>
            <div className="info-item">
              <div className="k">Close date</div>
              <div className="v">{fmtDate(d.close_date)}</div>
            </div>
            <div className="info-item">
              <div className="k">Organization</div>
              <div className="v">{d.organization_name ? <Link to={`/organizations/${d.organization_id}`}>{d.organization_name}</Link> : "—"}</div>
            </div>
            <div className="info-item">
              <div className="k">Primary contact</div>
              <div className="v">{d.contact_name ? <Link to={`/contacts/${d.contact_id}`}>{d.contact_name}</Link> : "—"}</div>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h3>Move between stages</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => moveStage(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 11px",
                  border: s === d.stage ? "1px solid var(--blue)" : "1px solid var(--gray-200)",
                  background: s === d.stage ? "var(--blue-soft)" : "#fff",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                  color: "var(--gray-700)",
                  fontWeight: 500,
                }}
              >
                <span className={STAGE_STYLES[s] ?? "badge"}>{s}</span>
                {s === d.stage && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--blue-dark)", fontWeight: 600 }}>Current</span>}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--gray-400)", margin: "10px 0 0" }}>
            You can also drag this deal on the Pipeline board.
          </p>
        </div>
      </div>

      <div className="detail-card">
        <h3>Activity</h3>
        <ActivityForm dealId={d.id} onAdded={reload} />
        <div className="mt-16">
          <ActivityTimeline activities={d.activities} onChanged={reload} emptyText="Nothing logged yet. Add your first note, call or email above." />
        </div>
      </div>

      {editing && (
        <DealFormModal
          deal={d}
          orgs={orgs}
          contacts={contacts}
          onClose={() => setEditing(false)}
          onSaved={() => { toast("Deal updated"); setEditing(false); reload(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete deal"
          message={<>Delete <strong>{d.name}</strong> and all of its activities?</>}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            try {
              await del(`/api/deals/${d.id}`);
              toast("Deal deleted");
              navigate("/deals");
            } catch (e) {
              toast(e instanceof Error ? e.message : "Failed to delete");
            }
          }}
        />
      )}
    </div>
  );
}