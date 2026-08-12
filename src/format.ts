export const STAGES = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;
export const CONTACT_STATUSES = ["lead", "qualified", "customer"] as const;
export const ACTIVITY_TYPES = ["note", "call", "email"] as const;

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function fmtMoneyCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1_000) return "$" + (n / 1_000).toFixed(abs >= 100_000 ? 0 : 1).replace(/\.0$/, "") + "K";
  return "$" + Math.round(n).toString();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = parseDate(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtDateShort(s: string | null | undefined): string {
  if (!s) return "—";
  const d = parseDate(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDateTime(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function relativeTime(s: string | null | undefined): string {
  if (!s) return "";
  const t = new Date(s.indexOf("T") > 0 ? s : s + "T00:00:00").getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return diff >= 0 ? "just now" : "in a moment";
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  if (diff >= 0 && hours < 1) return `${mins}m ago`;
  if (diff >= 0 && days < 1) return `${hours}h ago`;
  if (diff >= 0 && days < 7) return `${days}d ago`;
  if (diff < 0 && hours < 24) return `in ${hours}h`;
  if (diff < 0 && days < 7) return `in ${days}d`;
  return fmtDateShort(s);
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return parseDate(dueDate).getTime() < startOfToday().getTime();
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysFromTodayInput(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const STAGE_STYLES: Record<string, string> = {
  New: "badge stage-new",
  Qualified: "badge stage-qualified",
  Proposal: "badge stage-proposal",
  Negotiation: "badge stage-negotiation",
  Won: "badge stage-won",
  Lost: "badge stage-lost",
};

export const STATUS_STYLES: Record<string, string> = {
  lead: "badge status-lead",
  qualified: "badge status-qualified",
  customer: "badge status-customer",
};