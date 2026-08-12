import { useState } from "react";
import type { FormEvent } from "react";
import { Calendar, Check, Circle, Phone, Mail, StickyNote, Trash2 } from "lucide-react";
import type { ActivityRow } from "../../shared/types";
import { patch, post, del } from "../api";
import { useToast } from "./Toast";
import { fmtDateShort, isOverdue, relativeTime, todayInput } from "../format";

const TYPE_META: Record<string, { icon: typeof Phone; cls: string; label: string }> = {
  note: { icon: StickyNote, cls: "note", label: "Note" },
  call: { icon: Phone, cls: "call", label: "Call" },
  email: { icon: Mail, cls: "email", label: "Email" },
};

export function ActivityIcon({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? TYPE_META.note;
  const Icon = meta.icon;
  return (
    <div className={`timeline-icon ${meta.cls}`}>
      <Icon size={15} />
    </div>
  );
}

export function ActivityTypeLabel({ type }: { type: string }) {
  return <span className="timeline-type">{(TYPE_META[type] ?? TYPE_META.note).label}</span>;
}

export function DueChip({ dueDate, done }: { dueDate: string | null; done: boolean }) {
  if (!dueDate) return null;
  const overdue = !done && isOverdue(dueDate);
  const cls = done ? "done" : overdue ? "overdue" : "upcoming";
  return (
    <span className={`due-chip ${cls}`}>
      <Calendar size={11} />
      {done ? "Done" : overdue ? "Overdue · " : "Due "}
      {done ? "" : fmtDateShort(dueDate)}
    </span>
  );
}

export function ActivityTimeline({
  activities,
  onChanged,
  emptyText,
}: {
  activities: ActivityRow[];
  onChanged: () => void;
  emptyText: string;
}) {
  const toast = useToast();

  const toggleDone = async (a: ActivityRow) => {
    try {
      await patch<ActivityRow>(`/api/activities/${a.id}`, { done: !a.done });
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const remove = async (a: ActivityRow) => {
    try {
      await del(`/api/activities/${a.id}`);
      toast("Activity deleted");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (activities.length === 0) {
    return <p className="feed-empty">{emptyText}</p>;
  }

  return (
    <div className="timeline">
      {activities.map((a) => (
        <div key={a.id} className="timeline-item">
          <ActivityIcon type={a.type} />
          <div className="timeline-body">
            <div className="timeline-top">
              <ActivityTypeLabel type={a.type} />
              <span className="timeline-when">{relativeTime(a.happened_at)}</span>
              {a.due_date && <DueChip dueDate={a.due_date} done={Boolean(a.done)} />}
            </div>
            <div className={`timeline-desc ${a.done ? "strike" : ""}`}>{a.description}</div>
            {(a.contact_name || a.deal_name) && (
              <div className="timeline-links">
                {a.contact_name && <span>with {a.contact_name}</span>}
                {a.contact_name && a.deal_name && " · "}
                {a.deal_name && (
                  <a href={`/deals/${a.deal_id}`}>on {a.deal_name}</a>
                )}
              </div>
            )}
          </div>
          <div className="timeline-actions">
            <button
              className="icon-btn"
              title={a.done ? "Mark not done" : "Mark done"}
              onClick={() => toggleDone(a)}
              aria-label="Toggle done"
            >
              {a.done ? <Check size={16} className="text-danger" /> : <Circle size={16} />}
            </button>
            <button className="icon-btn danger" title="Delete activity" onClick={() => remove(a)} aria-label="Delete">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityForm({
  contactId,
  dealId,
  onAdded,
}: {
  contactId?: number;
  dealId?: number;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [type, setType] = useState("note");
  const [description, setDescription] = useState("");
  const [hasDue, setHasDue] = useState(false);
  const [dueDate, setDueDate] = useState(todayInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the activity.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { type, description: description.trim() };
      if (contactId) body.contact_id = contactId;
      if (dealId) body.deal_id = dealId;
      if (hasDue) body.due_date = dueDate;
      await post("/api/activities", body);
      toast("Activity logged");
      setDescription("");
      setHasDue(false);
      setDueDate(todayInput());
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="toolbar" style={{ marginBottom: 10 }}>
        {["note", "call", "email"].map((t) => (
          <button
            key={t}
            type="button"
            className={`btn btn-sm ${type === t ? "btn-primary" : ""}`}
            onClick={() => setType(t)}
          >
            {TYPE_META[t].label}
          </button>
        ))}
        <div className="spacer" />
        <label className="check-row" style={{ fontSize: 12.5 }}>
          <input type="checkbox" checked={hasDue} onChange={(e) => setHasDue(e.target.checked)} />
          Follow-up due date
        </label>
        {hasDue && (
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ padding: "5px 9px", border: "1px solid var(--gray-300)", borderRadius: 7, fontSize: 12.5 }}
          />
        )}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <textarea
          rows={2}
          style={{ flex: 1, fontFamily: "inherit", padding: "9px 12px", border: "1px solid var(--gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13.5, resize: "vertical", outline: "none" }}
          placeholder="What happened? Write a note, call or email summary..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="btn btn-primary" disabled={saving} style={{ flex: "none" }}>
          {saving ? "Saving…" : "Log activity"}
        </button>
      </div>
      {error && <p className="text-danger" style={{ fontSize: 12.5, margin: "8px 0 0" }}>{error}</p>}
    </form>
  );
}