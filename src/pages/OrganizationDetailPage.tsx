import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import { useData } from "../hooks";
import { fmtDate, fmtMoney, initials } from "../format";
import { errMsg, type Contact, type OrganizationDetail } from "../types";
import { ErrorBanner, Loading, BackLink } from "../components/ui";
import { StageBadge, StatusBadge } from "../components/Badges";
import { ConfirmDialog, Modal } from "../components/Modal";
import { ContactForm, DealForm, OrganizationForm } from "../components/forms";
import { useToast } from "../components/Toast";

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data: org, error, loading, reload } = useData(() => api<OrganizationDetail>(`/organizations/${id}`), [id]);
  const { data: allContacts } = useData(() => api<Contact[]>("/contacts"), [addingDeal]);

  async function handleDelete() {
    if (!org) return;
    setDeleteBusy(true);
    try {
      await api(`/organizations/${org.id}`, { method: "DELETE" });
      toast("Organization deleted");
      navigate("/organizations");
    } catch (e) {
      toast(errMsg(e), "error");
      setDeleteBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !org) return <ErrorBanner message={error ?? "Organization not found"} onRetry={reload} />;

  return (
    <>
      <BackLink to="/organizations" label="All organizations" />
      <div className="card detail-header">
        <span className="avatar org lg">{initials(org.name)}</span>
        <div className="detail-header-info">
          <div className="detail-title-row">
            <h1>{org.name}</h1>
          </div>
          <div className="detail-sub">{org.industry || "No industry set"}</div>
          <div className="detail-meta">
            {org.website && (
              <span className="meta-item">
                <Building2 size={14} />
                <a href={org.website.startsWith("http") ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer">
                  {org.website}
                </a>
              </span>
            )}
            <span className="meta-item">
              {org.contacts.length} {org.contacts.length === 1 ? "contact" : "contacts"}
            </span>
            <span className="meta-item">
              {org.deals.length} {org.deals.length === 1 ? "deal" : "deals"}
            </span>
          </div>
        </div>
        <div className="detail-actions">
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

      {org.notes && <div className="card card-pad section-gap secondary">{org.notes}</div>}

      <div className="card section-gap">
        <div className="card-pad">
          <div className="card-title">
            Contacts
            <button className="btn btn-sm" onClick={() => setAddingContact(true)}>
              <Plus size={13} />
              Add contact
            </button>
          </div>
          {org.contacts.length === 0 ? (
            <div className="empty-state">No contacts at this organization yet.</div>
          ) : (
            <div className="table-card" style={{ boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Title</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {org.contacts.map((c) => (
                    <tr key={c.id} className="clickable" onClick={() => navigate(`/contacts/${c.id}`)}>
                      <td>
                        <div className="cell-name">
                          <span className="avatar">{initials(c.name)}</span>
                          {c.name}
                        </div>
                      </td>
                      <td className="secondary">{c.title || <span className="muted">—</span>}</td>
                      <td className="secondary">{c.email || <span className="muted">—</span>}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-pad">
          <div className="card-title">
            Deals
            <button className="btn btn-sm" onClick={() => setAddingDeal(true)}>
              <Plus size={13} />
              Add deal
            </button>
          </div>
          {org.deals.length === 0 ? (
            <div className="empty-state">No deals with this organization yet.</div>
          ) : (
            <div className="table-card" style={{ boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Stage</th>
                    <th className="align-right">Value</th>
                    <th>Close date</th>
                    <th>Primary contact</th>
                  </tr>
                </thead>
                <tbody>
                  {org.deals.map((d) => (
                    <tr key={d.id} className="clickable" onClick={() => navigate(`/deals/${d.id}`)}>
                      <td className="cell-name">{d.name}</td>
                      <td>
                        <StageBadge stage={d.stage} />
                      </td>
                      <td className="align-right">{fmtMoney(d.value)}</td>
                      <td className="secondary">{fmtDate(d.close_date)}</td>
                      <td className="secondary">{d.contact_name ?? <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <Modal title="Edit organization" onClose={() => setEditing(false)}>
          <OrganizationForm
            initial={org}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await api(`/organizations/${org.id}`, { method: "PATCH", body: JSON.stringify(values) });
              toast("Organization updated");
              setEditing(false);
              reload();
            }}
          />
        </Modal>
      )}

      {addingContact && (
        <Modal title={`Add contact at ${org.name}`} onClose={() => setAddingContact(false)}>
          <ContactForm
            organizations={[org]}
            initial={{ organization_id: org.id }}
            lockOrganization
            submitLabel="Add contact"
            onSubmit={async (values) => {
              await api("/contacts", { method: "POST", body: JSON.stringify(values) });
              toast("Contact added");
              setAddingContact(false);
              reload();
            }}
          />
        </Modal>
      )}

      {addingDeal && (
        <Modal title={`Add deal for ${org.name}`} onClose={() => setAddingDeal(false)} width={600}>
          <DealForm
            organizations={[org]}
            contacts={allContacts ?? []}
            initial={{ organization_id: org.id }}
            lockOrganization
            submitLabel="Add deal"
            onSubmit={async (values) => {
              await api("/deals", { method: "POST", body: JSON.stringify(values) });
              toast("Deal added");
              setAddingDeal(false);
              reload();
            }}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete organization"
          busy={deleteBusy}
          message={
            <>
              Delete <strong>{org.name}</strong>? Its deals and their activities will be permanently deleted; its
              contacts will be kept without an organization.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
