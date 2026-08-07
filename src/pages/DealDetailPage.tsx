import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, CalendarClock, Gauge, Pencil, Trash2, User } from "lucide-react";
import { api } from "../api";
import { useData } from "../hooks";
import { fmtDate, fmtMoney } from "../format";
import { errMsg, STAGE_LABEL, STAGES, type Contact, type DealDetail, type DealStage, type Organization } from "../types";
import { ErrorBanner, Loading, BackLink } from "../components/ui";
import { StageBadge } from "../components/Badges";
import { ConfirmDialog, Modal } from "../components/Modal";
import { DealForm } from "../components/forms";
import { ActivityForm } from "../components/ActivityForm";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { useToast } from "../components/Toast";

export default function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data: deal, error, loading, reload } = useData(() => api<DealDetail>(`/deals/${id}`), [id]);
  const { data: organizations } = useData(() => api<Organization[]>("/organizations"), [editing]);
  const { data: contacts } = useData(() => api<Contact[]>("/contacts"), [editing]);

  async function changeStage(stage: DealStage) {
    if (!deal) return;
    try {
      await api(`/deals/${deal.id}`, { method: "PATCH", body: JSON.stringify({ stage }) });
      toast(`Deal moved to ${STAGE_LABEL[stage]}`);
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  async function handleDelete() {
    if (!deal) return;
    setDeleteBusy(true);
    try {
      await api(`/deals/${deal.id}`, { method: "DELETE" });
      toast("Deal deleted");
      navigate("/deals");
    } catch (e) {
      toast(errMsg(e), "error");
      setDeleteBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !deal) return <ErrorBanner message={error ?? "Deal not found"} onRetry={reload} />;

  return (
    <>
      <BackLink to="/deals" label="All deals" />
      <div className="card detail-header">
        <div className="detail-header-info">
          <div className="detail-title-row">
            <h1>{deal.name}</h1>
            <StageBadge stage={deal.stage} />
          </div>
          <div className="detail-sub">
            {deal.organization_name ? (
              <Link to={`/organizations/${deal.organization_id}`}>{deal.organization_name}</Link>
            ) : (
              "No organization"
            )}
          </div>
          <div className="detail-meta">
            <span className="meta-item deal-value-big">{fmtMoney(deal.value)}</span>
            <span className="meta-item">
              <Gauge size={14} />
              {deal.probability}% probability
            </span>
            <span className="meta-item">
              <CalendarClock size={14} />
              {deal.stage === "won" ? "Closed" : "Closes"} {fmtDate(deal.close_date)}
            </span>
            {deal.contact_name && (
              <span className="meta-item">
                <User size={14} />
                <Link to={`/contacts/${deal.contact_id}`}>{deal.contact_name}</Link>
              </span>
            )}
            {deal.organization_id && !deal.contact_name && (
              <span className="meta-item">
                <Building2 size={14} />
                <Link to={`/organizations/${deal.organization_id}`}>{deal.organization_name}</Link>
              </span>
            )}
          </div>
        </div>
        <div className="detail-actions">
          <select
            className="select"
            style={{ width: 150 }}
            value={deal.stage}
            onChange={(e) => changeStage(e.target.value as DealStage)}
            aria-label="Change stage"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Edit
          </button>
          <button className="btn btn-danger" onClick={() => setDeleting(true)}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-pad">
          <div className="card-title">Activity timeline</div>
          <ActivityForm dealId={deal.id} contactId={deal.contact_id ?? undefined} onLogged={reload} />
          <ActivityTimeline activities={deal.activities} onChanged={reload} />
        </div>
      </div>

      {editing && (
        <Modal title="Edit deal" onClose={() => setEditing(false)} width={600}>
          <DealForm
            initial={deal}
            organizations={organizations ?? []}
            contacts={contacts ?? []}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await api(`/deals/${deal.id}`, { method: "PATCH", body: JSON.stringify(values) });
              toast("Deal updated");
              setEditing(false);
              reload();
            }}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete deal"
          busy={deleteBusy}
          message={
            <>
              Delete <strong>{deal.name}</strong>? Its activities will be permanently deleted. This cannot be undone.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
