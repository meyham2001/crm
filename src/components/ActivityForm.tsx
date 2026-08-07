import { useState, type FormEvent } from "react";
import { Mail, Phone, Plus, StickyNote } from "lucide-react";
import { api } from "../api";
import { errMsg, type ActivityRow, type ActivityType } from "../types";
import { useToast } from "./Toast";

const TYPES: { value: ActivityType; label: string; icon: typeof StickyNote }[] = [
  { value: "note", label: "Note", icon: StickyNote },
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail }
];

export function ActivityForm({
  contactId,
  dealId,
  onLogged
}: {
  contactId?: number;
  dealId?: number;
  onLogged: () => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<ActivityType>("note");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please write a short description first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api<ActivityRow>("/activities", {
        method: "POST",
        body: JSON.stringify({
          type,
          description: description.trim(),
          due_date: dueDate || null,
          contact_id: contactId ?? null,
          deal_id: dealId ?? null
        })
      });
      toast(dueDate ? "Activity logged and task created" : "Activity logged");
      setDescription("");
      setDueDate("");
      setType("note");
      onLogged();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      {error && <div className="form-error">{error}</div>}
      <div className="segmented" role="tablist" aria-label="Activity type">
        {TYPES.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" className={type === value ? "active" : ""} onClick={() => setType(value)}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <div className="field">
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened? e.g. “Called about the renewal — they want pricing by Friday.”"
          style={{ minHeight: 60 }}
        />
      </div>
      <div className="form-row" style={{ alignItems: "flex-end" }}>
        <div className="field">
          <label htmlFor="act-due">Follow-up due date (optional)</label>
          <input id="act-due" className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="form-actions" style={{ margin: 0 }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            <Plus size={15} />
            {busy ? "Logging…" : "Log activity"}
          </button>
        </div>
      </div>
    </form>
  );
}
