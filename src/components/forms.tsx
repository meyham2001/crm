import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { errMsg, type Contact, type ContactStatus, type DealStage, type Organization, STATUS_LABEL, STAGE_LABEL, STAGES } from "../types";

/* ------------------------------------------------------------------ */
/* Organization form                                                   */
/* ------------------------------------------------------------------ */

export interface OrgValues {
  name: string;
  website: string;
  industry: string;
  notes: string;
}

export function OrganizationForm({
  initial,
  submitLabel,
  onSubmit
}: {
  initial?: Organization;
  submitLabel: string;
  onSubmit: (values: OrgValues) => Promise<void>;
}) {
  const [values, setValues] = useState<OrgValues>({
    name: initial?.name ?? "",
    website: initial?.website ?? "",
    industry: initial?.industry ?? "",
    notes: initial?.notes ?? ""
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof OrgValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="org-name">
          Name <span className="req">*</span>
        </label>
        <input id="org-name" className="input" value={values.name} onChange={set("name")} placeholder="Acme Inc." autoFocus />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="org-website">Website</label>
          <input id="org-website" className="input" value={values.website} onChange={set("website")} placeholder="acme.com" />
        </div>
        <div className="field">
          <label htmlFor="org-industry">Industry</label>
          <input id="org-industry" className="input" value={values.industry} onChange={set("industry")} placeholder="Manufacturing" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="org-notes">Notes</label>
        <textarea id="org-notes" className="textarea" value={values.notes} onChange={set("notes")} placeholder="Anything worth remembering about this organization…" />
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */

export interface ContactValues {
  name: string;
  email: string;
  phone: string;
  title: string;
  organization_id: number | null;
  status: ContactStatus;
}

export function ContactForm({
  initial,
  organizations,
  submitLabel,
  onSubmit,
  lockOrganization = false
}: {
  initial?: Partial<Contact>;
  organizations: Organization[];
  submitLabel: string;
  onSubmit: (values: ContactValues) => Promise<void>;
  lockOrganization?: boolean;
}) {
  const [values, setValues] = useState<ContactValues>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    title: initial?.title ?? "",
    organization_id: initial?.organization_id ?? null,
    status: (initial?.status as ContactStatus) ?? "lead"
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  const sortedOrgs = useMemo(() => [...organizations].sort((a, b) => a.name.localeCompare(b.name)), [organizations]);

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="c-name">
          Full name <span className="req">*</span>
        </label>
        <input id="c-name" className="input" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} placeholder="Jane Doe" autoFocus />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" className="input" type="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} placeholder="jane@acme.com" />
        </div>
        <div className="field">
          <label htmlFor="c-phone">Phone</label>
          <input id="c-phone" className="input" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} placeholder="(555) 555-0100" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-title">Job title</label>
          <input id="c-title" className="input" value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} placeholder="VP of Operations" />
        </div>
        <div className="field">
          <label htmlFor="c-status">Status</label>
          <select id="c-status" className="select" value={values.status} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as ContactStatus }))}>
            {(Object.keys(STATUS_LABEL) as ContactStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-org">Organization</label>
        <select
          id="c-org"
          className="select"
          value={values.organization_id ?? ""}
          disabled={lockOrganization}
          onChange={(e) => setValues((v) => ({ ...v, organization_id: e.target.value ? Number(e.target.value) : null }))}
        >
          <option value="">No organization</option>
          {sortedOrgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Deal form                                                           */
/* ------------------------------------------------------------------ */

export interface DealValues {
  name: string;
  organization_id: number | null;
  contact_id: number | null;
  stage: DealStage;
  value: number;
  probability: number;
  close_date: string | null;
}

/** Sensible default probability of close per pipeline stage. */
const STAGE_DEFAULT_PROB: Record<DealStage, number> = {
  new: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 70,
  won: 100,
  lost: 0
};

export function DealForm({
  initial,
  organizations,
  contacts,
  submitLabel,
  onSubmit,
  lockOrganization = false
}: {
  initial?: Partial<DealValues> & { close_date?: string | null };
  organizations: Organization[];
  contacts: Contact[];
  submitLabel: string;
  onSubmit: (values: DealValues) => Promise<void>;
  lockOrganization?: boolean;
}) {
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    organization_id: initial?.organization_id ?? null,
    contact_id: initial?.contact_id ?? null,
    stage: (initial?.stage as DealStage) ?? "new",
    value: initial?.value !== undefined && initial?.value !== null ? String(initial.value) : "",
    probability: String(initial?.probability ?? STAGE_DEFAULT_PROB[(initial?.stage as DealStage) ?? "new"]),
    close_date: initial?.close_date ?? null
  });
  // When editing an existing deal, treat the stored probability as deliberate.
  const probTouched = useRef(Boolean(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedOrgs = useMemo(() => [...organizations].sort((a, b) => a.name.localeCompare(b.name)), [organizations]);
  const contactOptions = useMemo(() => {
    const list = values.organization_id ? contacts.filter((c) => c.organization_id === values.organization_id) : contacts;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, values.organization_id]);

  const locked = values.stage === "won" || values.stage === "lost";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: DealValues = {
      name: values.name,
      organization_id: values.organization_id,
      contact_id: values.contact_id,
      stage: values.stage,
      value: values.value === "" ? 0 : Number(values.value),
      probability:
        values.stage === "won"
          ? 100
          : values.stage === "lost"
            ? 0
            : Number(values.probability === "" ? STAGE_DEFAULT_PROB[values.stage] : values.probability),
      close_date: values.close_date
    };
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="d-name">
          Deal name <span className="req">*</span>
        </label>
        <input id="d-name" className="input" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} placeholder="Annual license renewal" autoFocus />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="d-org">Organization</label>
          <select
            id="d-org"
            className="select"
            value={values.organization_id ?? ""}
            disabled={lockOrganization}
            onChange={(e) => {
              const orgId = e.target.value ? Number(e.target.value) : null;
              setValues((v) => ({ ...v, organization_id: orgId, contact_id: null }));
            }}
          >
            <option value="">No organization</option>
            {sortedOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d-contact">Primary contact</label>
          <select
            id="d-contact"
            className="select"
            value={values.contact_id ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, contact_id: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">No contact</option>
            {contactOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="d-stage">Stage</label>
          <select
            id="d-stage"
            className="select"
            value={values.stage}
            onChange={(e) => {
              const stage = e.target.value as DealStage;
              setValues((v) => ({
                ...v,
                stage,
                probability: probTouched.current ? v.probability : String(STAGE_DEFAULT_PROB[stage])
              }));
            }}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d-value">Value (USD)</label>
          <input
            id="d-value"
            className="input"
            type="number"
            min={0}
            step={500}
            placeholder="0"
            value={values.value}
            onChange={(e) => setValues((v) => ({ ...v, value: e.target.value }))}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="d-prob">Probability of close (%)</label>
          <input
            id="d-prob"
            className="input"
            type="number"
            min={0}
            max={100}
            value={locked ? (values.stage === "won" ? 100 : 0) : values.probability}
            disabled={locked}
            onChange={(e) => {
              probTouched.current = true;
              setValues((v) => ({ ...v, probability: e.target.value }));
            }}
          />
          {locked && <span className="hint">{values.stage === "won" ? "Won deals are always 100%." : "Lost deals are always 0%."}</span>}
        </div>
        <div className="field">
          <label htmlFor="d-close">{values.stage === "won" ? "Close date (actual)" : "Expected close date"}</label>
          <input
            id="d-close"
            className="input"
            type="date"
            value={values.close_date ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, close_date: e.target.value || null }))}
          />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
