import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { api } from "../api";
import { useData } from "../hooks";
import { initials } from "../format";
import { errMsg, type ContactDetail, type Organization } from "../types";
import { ErrorBanner, Loading, BackLink } from "../components/ui";
import { StatusBadge } from "../components/Badges";
import { ConfirmDialog, Modal } from "../components/Modal";
import { ContactForm } from "../components/forms";
import { ActivityForm } from "../components/ActivityForm";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { useToast } from "../components/Toast";

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data: contact, error, loading, reload } = useData(() => api<ContactDetail>(`/contacts/${id}`), [id]);
  const { data: organizations } = useData(() => api<Organization[]>("/organizations"), [editing]);

  async function handleDelete() {
    if (!contact) return;
    setDeleteBusy(true);
    try {
      await api(`/contacts/${contact.id}`, { method: "DELETE" });
      toast("Contact deleted");
      navigate("/contacts");
    } catch (e) {
      toast(errMsg(e), "error");
      setDeleteBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !contact) return <ErrorBanner message={error ?? "Contact not found"} onRetry={reload} />;

  return (
    <>
      <BackLink to="/contacts" label="All contacts" />
      <div className="card detail-header">
        <span className="avatar lg">{initials(contact.name)}</span>
        <div className="detail-header-info">
          <div className="detail-title-row">
            <h1>{contact.name}</h1>
            <StatusBadge status={contact.status} />
          </div>
          <div className="detail-sub">
            {contact.title || "No title"}
            {contact.organization_name && (
              <>
                {" · "}
                <Link to={`/organizations/${contact.organization_id}`}>{contact.organization_name}</Link>
              </>
            )}
          </div>
          <div className="detail-meta">
            {contact.email && (
              <span className="meta-item">
                <Mail size={14} />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </span>
            )}
            {contact.phone && (
              <span className="meta-item">
                <Phone size={14} />
                {contact.phone}
              </span>
            )}
            {contact.organization_id && (
              <span className="meta-item">
                <Building2 size={14} />
                <Link to={`/organizations/${contact.organization_id}`}>{contact.organization_name}</Link>
              </span>
            )}
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

      <div className="card section-gap">
        <div className="card-pad">
          <div className="card-title">Activity timeline</div>
          <ActivityForm contactId={contact.id} onLogged={reload} />
          <ActivityTimeline activities={contact.activities} onChanged={reload} />
        </div>
      </div>

      {editing && (
        <Modal title="Edit contact" onClose={() => setEditing(false)}>
          <ContactForm
            initial={contact}
            organizations={organizations ?? []}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await api(`/contacts/${contact.id}`, { method: "PATCH", body: JSON.stringify(values) });
              toast("Contact updated");
              setEditing(false);
              reload();
            }}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete contact"
          busy={deleteBusy}
          message={
            <>
              Delete <strong>{contact.name}</strong>? Their activities will be permanently deleted. Deals they are
              linked to will be kept without a primary contact.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
