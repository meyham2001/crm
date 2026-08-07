import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Inbox, Mail, Phone, StickyNote, Trash2 } from "lucide-react";
import { api } from "../api";
import { fmtDate, isOverdue, relTime } from "../format";
import { errMsg, type ActivityRow } from "../types";
import { useToast } from "./Toast";
import { ConfirmDialog } from "./Modal";

const TYPE_ICON = { note: StickyNote, call: Phone, email: Mail } as const;
const TYPE_LABEL = { note: "Note", call: "Call", email: "Email" } as const;

export function ActivityIcon({ type, size = 15, className = "" }: { type: ActivityRow["type"]; size?: number; className?: string }) {
  const Icon = TYPE_ICON[type];
  return <Icon size={size} className={className} />;
}

export function ActivityTimeline({
  activities,
  onChanged,
  showLinks = false
}: {
  activities: ActivityRow[];
  onChanged: () => void;
  showLinks?: boolean;
}) {
  const toast = useToast();
  const [deleting, setDeleting] = useState<ActivityRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function toggleDone(a: ActivityRow) {
    try {
      await api(`/activities/${a.id}`, { method: "PATCH", body: JSON.stringify({ done: !a.done }) });
      toast(a.done ? "Task marked as not done" : "Task marked as done");
      onChanged();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  async function remove(a: ActivityRow) {
    setDeleteBusy(true);
    try {
      await api(`/activities/${a.id}`, { method: "DELETE" });
      toast("Activity deleted");
      setDeleting(null);
      onChanged();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (activities.length === 0) {
    return (
      <div className="empty-state">
        <Inbox size={24} />
        <div>No activities yet. Log the first one above.</div>
      </div>
    );
  }

  return (
    <ul className="timeline">
      {activities.map((a) => {
        const Icon = TYPE_ICON[a.type];
        return (
          <li className="timeline-item" key={a.id}>
            <div className={`timeline-icon ${a.type}`}>
              <Icon size={15} />
            </div>
            <div className="timeline-body">
              <div className="timeline-head">
                <span className="timeline-type">{TYPE_LABEL[a.type]}</span>
                {showLinks && a.contact_name && (
                  <Link className="timeline-link" to={`/contacts/${a.contact_id}`}>
                    {a.contact_name}
                  </Link>
                )}
                {showLinks && a.deal_name && (
                  <Link className="timeline-link" to={`/deals/${a.deal_id}`}>
                    {a.deal_name}
                  </Link>
                )}
                <span className="timeline-time">{relTime(a.occurred_at)}</span>
              </div>
              <div className="timeline-desc">{a.description}</div>
              {a.due_date && (
                <div className="timeline-task">
                  <input
                    type="checkbox"
                    checked={a.done}
                    onChange={() => toggleDone(a)}
                    aria-label={a.done ? "Mark task as not done" : "Mark task as done"}
                  />
                  <span
                    className={`due-chip ${a.done ? "done" : isOverdue(a.due_date) ? "overdue" : ""}`}
                  >
                    <CalendarClock size={12} />
                    {a.done ? `Done · was due ${fmtDate(a.due_date)}` : isOverdue(a.due_date) ? `Overdue · ${fmtDate(a.due_date)}` : `Due ${fmtDate(a.due_date)}`}
                  </span>
                </div>
              )}
            </div>
            <button className="icon-btn danger" title="Delete activity" onClick={() => setDeleting(a)}>
              <Trash2 size={14} />
            </button>
          </li>
        );
      })}
      {deleting && (
        <ConfirmDialog
          title="Delete activity"
          busy={deleteBusy}
          message={
            <>
              Delete this {deleting.type}? “{deleting.description.slice(0, 120)}
              {deleting.description.length > 120 ? "…" : ""}” This cannot be undone.
            </>
          }
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </ul>
  );
}
