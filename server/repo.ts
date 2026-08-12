import type { DatabaseSync } from "node:sqlite";
import type {
  Activity,
  ActivityInput,
  ActivityRow,
  Contact,
  ContactInput,
  ContactRow,
  Deal,
  DealInput,
  DealRow,
  Organization,
  OrganizationInput,
  OrganizationRow,
} from "../shared/types.ts";
import { STAGES } from "./db.ts";

type Row = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString().slice(0, 19);
}

export const ORG_FIELDS = `
  o.id, o.name, o.website, o.industry, o.notes, o.created_at,
  (SELECT COUNT(*) FROM contacts c WHERE c.organization_id = o.id) AS contact_count,
  (SELECT COUNT(*) FROM deals d WHERE d.organization_id = o.id) AS deal_count,
  (SELECT COALESCE(SUM(d.value), 0) FROM deals d WHERE d.organization_id = o.id AND d.stage NOT IN ('Won','Lost')) AS open_deal_value
`;

// ---------- Organizations ----------

export function listOrganizations(db: DatabaseSync, search = ""): OrganizationRow[] {
  const q = search.trim();
  const rows = q
    ? db
        .prepare(`SELECT ${ORG_FIELDS} FROM organizations o WHERE o.name LIKE ? OR o.industry LIKE ? OR o.website LIKE ? ORDER BY o.name COLLATE NOCASE`)
        .all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare(`SELECT ${ORG_FIELDS} FROM organizations o ORDER BY o.name COLLATE NOCASE`).all();
  return rows as unknown as OrganizationRow[];
}

export function getOrganization(db: DatabaseSync, id: number): OrganizationRow | undefined {
  return db.prepare(`SELECT ${ORG_FIELDS} FROM organizations o WHERE o.id = ?`).get(id) as OrganizationRow | undefined;
}

export function createOrganization(db: DatabaseSync, input: OrganizationInput): Organization {
  const r = db
    .prepare("INSERT INTO organizations (name, website, industry, notes, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(input.name, input.website ?? null, input.industry ?? null, input.notes ?? null, nowIso());
  return getOrganization(db, Number(r.lastInsertRowid)) as unknown as Organization;
}

export function updateOrganization(db: DatabaseSync, id: number, input: OrganizationInput): Organization | undefined {
  const existing = getOrganization(db, id);
  if (!existing) return undefined;
  db.prepare("UPDATE organizations SET name = ?, website = ?, industry = ?, notes = ? WHERE id = ?").run(
    input.name,
    input.website ?? null,
    input.industry ?? null,
    input.notes ?? null,
    id
  );
  return getOrganization(db, id) as unknown as Organization;
}

export function deleteOrganization(db: DatabaseSync, id: number): boolean {
  const r = db.prepare("DELETE FROM organizations WHERE id = ?").run(id);
  return Number(r.changes) > 0;
}

// ---------- Contacts ----------

const CONTACT_FIELDS = `
  c.id, c.organization_id, c.name, c.email, c.phone, c.job_title, c.status, c.created_at,
  o.name AS organization_name,
  (SELECT COUNT(*) FROM deals d WHERE d.contact_id = c.id) AS deal_count,
  (SELECT COALESCE(SUM(d.value), 0) FROM deals d WHERE d.contact_id = c.id AND d.stage NOT IN ('Won','Lost')) AS open_deal_value
`;

export function listContacts(db: DatabaseSync, opts: { search?: string; status?: string } = {}): ContactRow[] {
  const q = (opts.search ?? "").trim();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (q) {
    where.push("(c.name LIKE ? OR c.email LIKE ? OR c.job_title LIKE ? OR o.name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (opts.status && opts.status !== "all") {
    where.push("c.status = ?");
    params.push(opts.status);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT ${CONTACT_FIELDS} FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id ${clause} ORDER BY c.name COLLATE NOCASE`).all(...params);
  return rows as unknown as ContactRow[];
}

export function getContact(db: DatabaseSync, id: number): ContactRow | undefined {
  return db.prepare(`SELECT ${CONTACT_FIELDS} FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id WHERE c.id = ?`).get(id) as ContactRow | undefined;
}

export function createContact(db: DatabaseSync, input: ContactInput): Contact {
  const r = db
    .prepare("INSERT INTO contacts (organization_id, name, email, phone, job_title, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(input.organization_id ?? null, input.name, input.email ?? null, input.phone ?? null, input.job_title ?? null, input.status ?? "lead", nowIso());
  return getContact(db, Number(r.lastInsertRowid)) as unknown as Contact;
}

export function updateContact(db: DatabaseSync, id: number, input: ContactInput): Contact | undefined {
  const existing = getContact(db, id);
  if (!existing) return undefined;
  db.prepare("UPDATE contacts SET organization_id = ?, name = ?, email = ?, phone = ?, job_title = ?, status = ? WHERE id = ?").run(
    input.organization_id ?? null,
    input.name,
    input.email ?? null,
    input.phone ?? null,
    input.job_title ?? null,
    input.status ?? "lead",
    id
  );
  return getContact(db, id) as unknown as Contact;
}

export function deleteContact(db: DatabaseSync, id: number): boolean {
  const r = db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
  return Number(r.changes) > 0;
}

// ---------- Deals ----------

const DEAL_FIELDS = `
  d.id, d.organization_id, d.contact_id, d.name, d.stage, d.value, d.probability, d.close_date, d.created_at,
  o.name AS organization_name,
  c.name AS contact_name,
  ROUND(d.value * d.probability / 100.0, 2) AS expected_value
`;

export function listDeals(db: DatabaseSync, opts: { search?: string; stage?: string; contactId?: number; organizationId?: number } = {}): DealRow[] {
  const q = (opts.search ?? "").trim();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (q) {
    where.push("(d.name LIKE ? OR o.name LIKE ? OR c.name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (opts.stage && opts.stage !== "all") {
    where.push("d.stage = ?");
    params.push(opts.stage);
  }
  if (opts.contactId) {
    where.push("d.contact_id = ?");
    params.push(opts.contactId);
  }
  if (opts.organizationId) {
    where.push("d.organization_id = ?");
    params.push(opts.organizationId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT ${DEAL_FIELDS} FROM deals d LEFT JOIN organizations o ON o.id = d.organization_id LEFT JOIN contacts c ON c.id = d.contact_id ${clause} ORDER BY d.created_at DESC, d.id DESC`)
    .all(...params);
  return rows as unknown as DealRow[];
}

export function getDeal(db: DatabaseSync, id: number): DealRow | undefined {
  return db
    .prepare(`SELECT ${DEAL_FIELDS} FROM deals d LEFT JOIN organizations o ON o.id = d.organization_id LEFT JOIN contacts c ON c.id = d.contact_id WHERE d.id = ?`)
    .get(id) as DealRow | undefined;
}

export function createDeal(db: DatabaseSync, input: DealInput): Deal {
  const r = db
    .prepare("INSERT INTO deals (organization_id, contact_id, name, stage, value, probability, close_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(
      input.organization_id,
      input.contact_id ?? null,
      input.name,
      input.stage ?? "New",
      input.value ?? 0,
      input.probability ?? 0,
      input.close_date ?? null,
      nowIso()
    );
  return getDeal(db, Number(r.lastInsertRowid)) as unknown as Deal;
}

export function updateDeal(db: DatabaseSync, id: number, input: DealInput): Deal | undefined {
  const existing = getDeal(db, id);
  if (!existing) return undefined;
  const stage = input.stage ?? existing.stage;
  let probability = input.probability ?? existing.probability;
  if (stage === "Won") probability = 100;
  if (stage === "Lost") probability = 0;
  db.prepare("UPDATE deals SET organization_id = ?, contact_id = ?, name = ?, stage = ?, value = ?, probability = ?, close_date = ? WHERE id = ?").run(
    input.organization_id,
    input.contact_id ?? null,
    input.name,
    stage,
    input.value ?? existing.value,
    probability,
    input.close_date !== undefined ? input.close_date : (existing.close_date ?? null),
    id
  );
  return getDeal(db, id) as unknown as Deal;
}

export function changeDealStage(db: DatabaseSync, id: number, stage: string): Deal | undefined {
  if (!(STAGES as readonly string[]).includes(stage)) throw new Error(`Invalid stage: ${stage}`);
  const existing = getDeal(db, id);
  if (!existing) return undefined;
  let probability = existing.probability;
  if (stage === "Won") probability = 100;
  if (stage === "Lost") probability = 0;
  db.prepare("UPDATE deals SET stage = ?, probability = ? WHERE id = ?").run(stage, probability, id);
  return getDeal(db, id) as unknown as Deal;
}

export function deleteDeal(db: DatabaseSync, id: number): boolean {
  const r = db.prepare("DELETE FROM deals WHERE id = ?").run(id);
  return Number(r.changes) > 0;
}

export function pipelineSummary(db: DatabaseSync): { stage: string; count: number; value: number; expected: number }[] {
  const rows = db
    .prepare("SELECT stage, COUNT(*) AS count, COALESCE(SUM(value), 0) AS value, COALESCE(ROUND(SUM(value * probability / 100.0), 2), 0) AS expected FROM deals GROUP BY stage")
    .all() as unknown as { stage: string; count: number; value: number; expected: number }[];
  const byStage = new Map(rows.map((r) => [r.stage, r]));
  return STAGES.map((s) => ({
    stage: s,
    count: Number(byStage.get(s)?.count ?? 0),
    value: Number(byStage.get(s)?.value ?? 0),
    expected: Number(byStage.get(s)?.expected ?? 0),
  }));
}

// ---------- Activities ----------

export const ACTIVITY_FIELDS = `
  a.id, a.contact_id, a.deal_id, a.type, a.description, a.happened_at, a.due_date, a.done, a.created_at,
  c.name AS contact_name,
  d.name AS deal_name,
  o.name AS organization_name
`;

function rowsToActivities(rows: Row[]): ActivityRow[] {
  return rows.map((r) => ({ ...r, done: Number(r.done) ? 1 : 0 })) as unknown as ActivityRow[];
}

export function listActivitiesForContact(db: DatabaseSync, contactId: number): ActivityRow[] {
  const rows = db
    .prepare(
      `SELECT ${ACTIVITY_FIELDS} FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN organizations o ON o.id = d.organization_id
       WHERE a.contact_id = ? ORDER BY a.happened_at DESC, a.id DESC`
    )
    .all(contactId);
  return rowsToActivities(rows);
}

export function listActivitiesForDeal(db: DatabaseSync, dealId: number): ActivityRow[] {
  const rows = db
    .prepare(
      `SELECT ${ACTIVITY_FIELDS} FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN organizations o ON o.id = d.organization_id
       WHERE a.deal_id = ? ORDER BY a.happened_at DESC, a.id DESC`
    )
    .all(dealId);
  return rowsToActivities(rows);
}

export function listAllActivities(db: DatabaseSync, limit = 50): ActivityRow[] {
  const rows = db
    .prepare(
      `SELECT ${ACTIVITY_FIELDS} FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN organizations o ON o.id = d.organization_id
       ORDER BY a.happened_at DESC, a.id DESC LIMIT ?`
    )
    .all(limit);
  return rowsToActivities(rows);
}

export function createActivity(db: DatabaseSync, input: ActivityInput): Activity {
  const happened = input.happened_at ?? nowIso();
  const r = db
    .prepare("INSERT INTO activities (contact_id, deal_id, type, description, happened_at, due_date, done, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(
      input.contact_id ?? null,
      input.deal_id ?? null,
      input.type ?? "note",
      input.description,
      happened,
      input.due_date ?? null,
      input.done ? 1 : 0,
      nowIso()
    );
  const id = Number(r.lastInsertRowid);
  return { id, contact_id: input.contact_id ?? null, deal_id: input.deal_id ?? null, type: input.type ?? "note", description: input.description, happened_at: happened, due_date: input.due_date ?? null, done: input.done ? 1 : 0, created_at: happened };
}

export function setActivityDone(db: DatabaseSync, id: number, done: boolean): ActivityRow | undefined {
  const r = db.prepare("UPDATE activities SET done = ? WHERE id = ?").run(done ? 1 : 0, id);
  if (Number(r.changes) === 0) return undefined;
  const row = db
    .prepare(
      `SELECT ${ACTIVITY_FIELDS} FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN organizations o ON o.id = d.organization_id
       WHERE a.id = ?`
    )
    .get(id);
  return rowsToActivities([row as Row])[0];
}

export function updateActivity(db: DatabaseSync, id: number, input: Partial<ActivityInput>): ActivityRow | undefined {
  const existing = db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as Row | undefined;
  if (!existing) return undefined;
  db.prepare("UPDATE activities SET type = ?, description = ?, happened_at = ?, due_date = ?, done = ? WHERE id = ?").run(
    input.type ?? (existing.type as string),
    input.description ?? (existing.description as string),
    input.happened_at ?? (existing.happened_at as string),
    input.due_date !== undefined ? input.due_date : (existing.due_date as string | null),
    input.done !== undefined ? (input.done ? 1 : 0) : (existing.done as number),
    id
  );
  return setActivityDone(db, id, (input.done !== undefined ? input.done : Boolean(existing.done)) as boolean);
}

export function deleteActivity(db: DatabaseSync, id: number): boolean {
  const r = db.prepare("DELETE FROM activities WHERE id = ?").run(id);
  return Number(r.changes) > 0;
}

export function listTasks(db: DatabaseSync, maxDaysAhead = 14): ActivityRow[] {
  const now = nowIso();
  const horizon = new Date(Date.now() + maxDaysAhead * 86_400_000).toISOString().slice(0, 19);
  const rows = db
    .prepare(
      `SELECT ${ACTIVITY_FIELDS} FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN organizations o ON o.id = d.organization_id
       WHERE a.due_date IS NOT NULL AND a.due_date <= ? AND a.done = 0
       ORDER BY a.due_date ASC, a.id DESC`
    )
    .all(horizon);
  return rowsToActivities(rows).map((r) => ({
    ...r,
    overdue: r.due_date !== null && r.due_date < now ? 1 : 0,
  }));
}

// ---------- Dashboard stats ----------

export type MonthPoint = { month: string; label: string; count: number; revenue: number };

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function wonByMonth(db: DatabaseSync, months = 6): MonthPoint[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const rows = db
    .prepare("SELECT close_date, value FROM deals WHERE stage = 'Won' AND close_date >= ?")
    .all(start.toISOString().slice(0, 19)) as unknown as { close_date: string; value: number }[];
  const map = new Map<string, { count: number; revenue: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    map.set(monthKey(d), { count: 0, revenue: 0 });
  }
  for (const r of rows) {
    const key = (r.close_date ?? "").slice(0, 7);
    const entry = map.get(key);
    if (entry) {
      entry.count += 1;
      entry.revenue += Number(r.value);
    }
  }
  return [...map.entries()].map(([key, v]) => {
    const [y, m] = key.split("-").map(Number);
    return { month: key, label: `${MONTH_LABELS[m - 1]} ${y}`, count: v.count, revenue: Math.round(v.revenue) };
  });
}

export type DashboardStats = {
  openValue: number;
  openExpected: number;
  openCount: number;
  wonCount: number;
  wonValue: number;
  wonThisMonthCount: number;
  wonThisMonthValue: number;
  taskDueCount: number;
  wonByMonth: MonthPoint[];
  pipeline: { stage: string; count: number; value: number; expected: number }[];
  recent: ActivityRow[];
  tasks: ActivityRow[];
};

export function dashboardStats(db: DatabaseSync): DashboardStats {
  const open = db
    .prepare("SELECT COALESCE(SUM(value), 0) AS v, COALESCE(SUM(value * probability / 100.0), 0) AS e, COUNT(*) AS c FROM deals WHERE stage NOT IN ('Won','Lost')")
    .get() as Row;
  const won = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(value), 0) AS v FROM deals WHERE stage = 'Won'").get() as Row;
  const monthStart = new Date();
  monthStart.setDate(1);
  const wonThisMonth = db
    .prepare("SELECT COUNT(*) AS c, COALESCE(SUM(value), 0) AS v FROM deals WHERE stage = 'Won' AND close_date >= ?")
    .get(monthStart.toISOString().slice(0, 19)) as Row;
  const tasks = listTasks(db, 14);
  const taskDueCount = db
    .prepare("SELECT COUNT(*) AS c FROM activities WHERE due_date IS NOT NULL AND done = 0 AND due_date <= ?")
    .get(new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 19)) as Row;

  return {
    openValue: Number(open.v),
    openExpected: Number(open.e),
    openCount: Number(open.c),
    wonCount: Number(won.c),
    wonValue: Number(won.v),
    wonThisMonthCount: Number(wonThisMonth.c),
    wonThisMonthValue: Number(wonThisMonth.v),
    taskDueCount: Number(taskDueCount.c),
    wonByMonth: wonByMonth(db, 6),
    pipeline: pipelineSummary(db),
    recent: listAllActivities(db, 10),
    tasks,
  };
}