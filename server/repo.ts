import type { DB } from "./db";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

export const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;
export type DealStage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<DealStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost"
};

export const STATUSES = ["lead", "qualified", "customer"] as const;
export type ContactStatus = (typeof STATUSES)[number];

export const ACTIVITY_TYPES = ["note", "call", "email"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface Organization {
  id: number;
  name: string;
  website: string;
  industry: string;
  notes: string;
  created_at: string;
}

export interface OrganizationRow extends Organization {
  contact_count: number;
  deal_count: number;
  open_value: number;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  title: string;
  organization_id: number | null;
  status: ContactStatus;
  created_at: string;
}

export interface ContactRow extends Contact {
  organization_name: string | null;
}

export interface Deal {
  id: number;
  name: string;
  organization_id: number | null;
  contact_id: number | null;
  stage: DealStage;
  value: number;
  probability: number;
  close_date: string | null;
  created_at: string;
}

export interface DealRow extends Deal {
  organization_name: string | null;
  contact_name: string | null;
}

export interface Activity {
  id: number;
  type: ActivityType;
  contact_id: number | null;
  deal_id: number | null;
  description: string;
  occurred_at: string;
  due_date: string | null;
  done: boolean;
}

export interface ActivityRow extends Activity {
  contact_name: string | null;
  deal_name: string | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

function cleanStr(v: unknown, field: string, { required = false, max = 500 } = {}): string {
  if (v === undefined || v === null) {
    if (required) throw new ApiError(400, `${field} is required`);
    return "";
  }
  if (typeof v !== "string") throw new ApiError(400, `${field} must be a string`);
  const s = v.trim();
  if (required && s.length === 0) throw new ApiError(400, `${field} is required`);
  if (s.length > max) throw new ApiError(400, `${field} is too long (max ${max} characters)`);
  return s;
}

function cleanNumber(v: unknown, field: string, { min, max, default: def }: { min: number; max: number; default?: number }): number {
  if (v === undefined || v === null || v === "") {
    if (def !== undefined) return def;
    throw new ApiError(400, `${field} is required`);
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new ApiError(400, `${field} must be a number`);
  if (n < min || n > max) throw new ApiError(400, `${field} must be between ${min} and ${max}`);
  return n;
}

function cleanDate(v: unknown, field: string): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !DATE_RE.test(v) || isNaN(new Date(v + "T00:00:00Z").getTime())) {
    throw new ApiError(400, `${field} must be a date in YYYY-MM-DD format`);
  }
  return v;
}

function rowToActivity(r: any): ActivityRow {
  return { ...r, done: Boolean(r.done) };
}

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

export function listOrganizations(db: DB, search?: string): OrganizationRow[] {
  const q = search?.trim();
  const sql = `
    SELECT o.*,
      (SELECT COUNT(*) FROM contacts c WHERE c.organization_id = o.id) AS contact_count,
      (SELECT COUNT(*) FROM deals d WHERE d.organization_id = o.id) AS deal_count,
      (SELECT COALESCE(SUM(d.value), 0) FROM deals d WHERE d.organization_id = o.id AND d.stage NOT IN ('won','lost')) AS open_value
    FROM organizations o
    WHERE (? IS NULL OR o.name LIKE ? ESCAPE '\\' OR o.industry LIKE ? ESCAPE '\\')
    ORDER BY o.name COLLATE NOCASE`;
  const pattern = q ? `%${escapeLike(q)}%` : null;
  return db.prepare(sql).all(q ?? null, pattern, pattern) as OrganizationRow[];
}

export function getOrganization(db: DB, id: number) {
  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(id) as Organization | undefined;
  if (!org) throw new ApiError(404, "Organization not found");
  const contacts = db
    .prepare("SELECT * FROM contacts WHERE organization_id = ? ORDER BY name COLLATE NOCASE")
    .all(id) as Contact[];
  const deals = db
    .prepare(
      `SELECT d.*, c.name AS contact_name FROM deals d
       LEFT JOIN contacts c ON c.id = d.contact_id
       WHERE d.organization_id = ? ORDER BY d.created_at DESC`
    )
    .all(id) as DealRow[];
  return { ...org, contacts, deals };
}

export function createOrganization(db: DB, data: any): Organization {
  const name = cleanStr(data?.name, "Name", { required: true, max: 200 });
  const website = cleanStr(data?.website, "Website", { max: 300 });
  const industry = cleanStr(data?.industry, "Industry", { max: 120 });
  const notes = cleanStr(data?.notes, "Notes", { max: 4000 });
  const info = db
    .prepare("INSERT INTO organizations (name, website, industry, notes) VALUES (?, ?, ?, ?)")
    .run(name, website, industry, notes);
  return db.prepare("SELECT * FROM organizations WHERE id = ?").get(info.lastInsertRowid) as Organization;
}

export function updateOrganization(db: DB, id: number, data: any): Organization {
  const existing = db.prepare("SELECT * FROM organizations WHERE id = ?").get(id) as Organization | undefined;
  if (!existing) throw new ApiError(404, "Organization not found");
  const name = data?.name !== undefined ? cleanStr(data.name, "Name", { required: true, max: 200 }) : existing.name;
  const website = data?.website !== undefined ? cleanStr(data.website, "Website", { max: 300 }) : existing.website;
  const industry = data?.industry !== undefined ? cleanStr(data.industry, "Industry", { max: 120 }) : existing.industry;
  const notes = data?.notes !== undefined ? cleanStr(data.notes, "Notes", { max: 4000 }) : existing.notes;
  db.prepare("UPDATE organizations SET name = ?, website = ?, industry = ?, notes = ? WHERE id = ?").run(
    name,
    website,
    industry,
    notes,
    id
  );
  return db.prepare("SELECT * FROM organizations WHERE id = ?").get(id) as Organization;
}

export function deleteOrganization(db: DB, id: number): void {
  const info = db.prepare("DELETE FROM organizations WHERE id = ?").run(id);
  if (info.changes === 0) throw new ApiError(404, "Organization not found");
}

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

export function listContacts(db: DB, opts: { search?: string; status?: string } = {}): ContactRow[] {
  const q = opts.search?.trim();
  let status: string | null = null;
  if (opts.status) {
    if (!STATUSES.includes(opts.status as ContactStatus)) throw new ApiError(400, "Invalid status filter");
    status = opts.status;
  }
  const sql = `
    SELECT c.*, o.name AS organization_name
    FROM contacts c
    LEFT JOIN organizations o ON o.id = c.organization_id
    WHERE (? IS NULL OR c.name LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.title LIKE ? ESCAPE '\\')
      AND (? IS NULL OR c.status = ?)
    ORDER BY c.name COLLATE NOCASE`;
  const pattern = q ? `%${escapeLike(q)}%` : null;
  return db
    .prepare(sql)
    .all(q ?? null, pattern, pattern, pattern, status, status) as unknown as ContactRow[];
}

export function getContact(db: DB, id: number) {
  const contact = db
    .prepare(
      `SELECT c.*, o.name AS organization_name FROM contacts c
       LEFT JOIN organizations o ON o.id = c.organization_id WHERE c.id = ?`
    )
    .get(id) as ContactRow | undefined;
  if (!contact) throw new ApiError(404, "Contact not found");
  const activities = listActivities(db, { contactId: id });
  return { ...contact, activities };
}

export function createContact(db: DB, data: any): ContactRow {
  const name = cleanStr(data?.name, "Name", { required: true, max: 200 });
  const email = cleanStr(data?.email, "Email", { max: 300 });
  const phone = cleanStr(data?.phone, "Phone", { max: 60 });
  const title = cleanStr(data?.title, "Job title", { max: 200 });
  let status: ContactStatus = "lead";
  if (data?.status !== undefined && data?.status !== null && data?.status !== "") {
    if (!STATUSES.includes(data.status)) throw new ApiError(400, "Status must be lead, qualified or customer");
    status = data.status;
  }
  let orgId: number | null = null;
  if (data?.organization_id !== undefined && data?.organization_id !== null && data?.organization_id !== "") {
    orgId = cleanNumber(data.organization_id, "Organization", { min: 1, max: Number.MAX_SAFE_INTEGER });
    if (!db.prepare("SELECT id FROM organizations WHERE id = ?").get(orgId)) {
      throw new ApiError(400, "Organization does not exist");
    }
  }
  const info = db
    .prepare(
      "INSERT INTO contacts (name, email, phone, title, organization_id, status) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, email, phone, title, orgId, status);
  return listContacts(db).find((c) => c.id === info.lastInsertRowid) as ContactRow;
}

export function updateContact(db: DB, id: number, data: any): ContactRow {
  const existing = db.prepare("SELECT * FROM contacts WHERE id = ?").get(id) as Contact | undefined;
  if (!existing) throw new ApiError(404, "Contact not found");
  const name = data?.name !== undefined ? cleanStr(data.name, "Name", { required: true, max: 200 }) : existing.name;
  const email = data?.email !== undefined ? cleanStr(data.email, "Email", { max: 300 }) : existing.email;
  const phone = data?.phone !== undefined ? cleanStr(data.phone, "Phone", { max: 60 }) : existing.phone;
  const title = data?.title !== undefined ? cleanStr(data.title, "Job title", { max: 200 }) : existing.title;
  let status = existing.status;
  if (data?.status !== undefined) {
    if (!STATUSES.includes(data.status)) throw new ApiError(400, "Status must be lead, qualified or customer");
    status = data.status;
  }
  let orgId = existing.organization_id;
  if (data?.organization_id !== undefined) {
    if (data.organization_id === null || data.organization_id === "") {
      orgId = null;
    } else {
      orgId = cleanNumber(data.organization_id, "Organization", { min: 1, max: Number.MAX_SAFE_INTEGER });
      if (!db.prepare("SELECT id FROM organizations WHERE id = ?").get(orgId)) {
        throw new ApiError(400, "Organization does not exist");
      }
    }
  }
  db.prepare(
    "UPDATE contacts SET name = ?, email = ?, phone = ?, title = ?, organization_id = ?, status = ? WHERE id = ?"
  ).run(name, email, phone, title, orgId, status, id);
  return listContacts(db).find((c) => c.id === id) as ContactRow;
}

export function deleteContact(db: DB, id: number): void {
  const info = db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
  if (info.changes === 0) throw new ApiError(404, "Contact not found");
}

/* ------------------------------------------------------------------ */
/* Deals                                                               */
/* ------------------------------------------------------------------ */

export function listDeals(db: DB, opts: { search?: string; stage?: string } = {}): DealRow[] {
  const q = opts.search?.trim();
  let stage: string | null = null;
  if (opts.stage) {
    if (!STAGES.includes(opts.stage as DealStage)) throw new ApiError(400, "Invalid stage filter");
    stage = opts.stage;
  }
  const sql = `
    SELECT d.*, o.name AS organization_name, c.name AS contact_name
    FROM deals d
    LEFT JOIN organizations o ON o.id = d.organization_id
    LEFT JOIN contacts c ON c.id = d.contact_id
    WHERE (? IS NULL OR d.name LIKE ? ESCAPE '\\' OR o.name LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')
      AND (? IS NULL OR d.stage = ?)
    ORDER BY d.created_at DESC, d.id DESC`;
  const pattern = q ? `%${escapeLike(q)}%` : null;
  return db.prepare(sql).all(q ?? null, pattern, pattern, pattern, stage, stage) as unknown as DealRow[];
}

export function getDeal(db: DB, id: number) {
  const deal = db
    .prepare(
      `SELECT d.*, o.name AS organization_name, c.name AS contact_name
       FROM deals d
       LEFT JOIN organizations o ON o.id = d.organization_id
       LEFT JOIN contacts c ON c.id = d.contact_id
       WHERE d.id = ?`
    )
    .get(id) as DealRow | undefined;
  if (!deal) throw new ApiError(404, "Deal not found");
  const activities = listActivities(db, { dealId: id });
  return { ...deal, activities };
}

function validateDealRefs(db: DB, orgId: number | null, contactId: number | null): void {
  if (orgId !== null && !db.prepare("SELECT id FROM organizations WHERE id = ?").get(orgId)) {
    throw new ApiError(400, "Organization does not exist");
  }
  if (contactId !== null && !db.prepare("SELECT id FROM contacts WHERE id = ?").get(contactId)) {
    throw new ApiError(400, "Contact does not exist");
  }
}

function cleanStage(v: unknown, field = "Stage"): DealStage {
  if (!STAGES.includes(v as DealStage)) throw new ApiError(400, `${field} must be one of: ${STAGES.join(", ")}`);
  return v as DealStage;
}

export function createDeal(db: DB, data: any): DealRow {
  const name = cleanStr(data?.name, "Name", { required: true, max: 200 });
  const value = cleanNumber(data?.value, "Value", { min: 0, max: 1_000_000_000, default: 0 });
  let stage: DealStage = "new";
  if (data?.stage !== undefined && data?.stage !== null && data?.stage !== "") stage = cleanStage(data.stage);
  let probability = Math.round(cleanNumber(data?.probability, "Probability", { min: 0, max: 100, default: 50 }));
  const close_date = cleanDate(data?.close_date, "Close date");
  let orgId: number | null = null;
  if (data?.organization_id !== undefined && data?.organization_id !== null && data?.organization_id !== "") {
    orgId = cleanNumber(data.organization_id, "Organization", { min: 1, max: Number.MAX_SAFE_INTEGER });
  }
  let contactId: number | null = null;
  if (data?.contact_id !== undefined && data?.contact_id !== null && data?.contact_id !== "") {
    contactId = cleanNumber(data.contact_id, "Contact", { min: 1, max: Number.MAX_SAFE_INTEGER });
  }
  validateDealRefs(db, orgId, contactId);
  // Won/Lost deals have a fixed probability.
  if (stage === "won") probability = 100;
  if (stage === "lost") probability = 0;
  const info = db
    .prepare(
      `INSERT INTO deals (name, organization_id, contact_id, stage, value, probability, close_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, orgId, contactId, stage, value, probability, close_date);
  return listDeals(db).find((d) => d.id === info.lastInsertRowid) as DealRow;
}

export function updateDeal(db: DB, id: number, data: any): DealRow {
  const existing = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as Deal | undefined;
  if (!existing) throw new ApiError(404, "Deal not found");
  const name = data?.name !== undefined ? cleanStr(data.name, "Name", { required: true, max: 200 }) : existing.name;
  const value =
    data?.value !== undefined
      ? cleanNumber(data.value, "Value", { min: 0, max: 1_000_000_000 })
      : existing.value;
  const stage: DealStage =
    data?.stage !== undefined && data?.stage !== null && data?.stage !== ""
      ? cleanStage(data.stage)
      : existing.stage;
  let probability =
    data?.probability !== undefined && data?.probability !== null && data?.probability !== ""
      ? Math.round(cleanNumber(data.probability, "Probability", { min: 0, max: 100 }))
      : existing.probability;
  let close_date = data?.close_date !== undefined ? cleanDate(data.close_date, "Close date") : existing.close_date;
  let orgId = existing.organization_id;
  if (data?.organization_id !== undefined) {
    if (data.organization_id === null || data.organization_id === "") orgId = null;
    else orgId = cleanNumber(data.organization_id, "Organization", { min: 1, max: Number.MAX_SAFE_INTEGER });
  }
  let contactId = existing.contact_id;
  if (data?.contact_id !== undefined) {
    if (data.contact_id === null || data.contact_id === "") contactId = null;
    else contactId = cleanNumber(data.contact_id, "Contact", { min: 1, max: Number.MAX_SAFE_INTEGER });
  }
  validateDealRefs(db, orgId, contactId);
  // Stage side-effects: winning locks probability to 100% and stamps the close
  // date (so the dashboard's monthly charts stay accurate); losing locks to 0%.
  if (stage === "won") {
    probability = 100;
    if (!close_date) close_date = todayISO();
  }
  if (stage === "lost") probability = 0;
  db.prepare(
    `UPDATE deals SET name = ?, organization_id = ?, contact_id = ?, stage = ?, value = ?, probability = ?, close_date = ?
     WHERE id = ?`
  ).run(name, orgId, contactId, stage, value, probability, close_date, id);
  return listDeals(db).find((d) => d.id === id) as DealRow;
}

export function deleteDeal(db: DB, id: number): void {
  const info = db.prepare("DELETE FROM deals WHERE id = ?").run(id);
  if (info.changes === 0) throw new ApiError(404, "Deal not found");
}

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */

const ACTIVITY_SELECT = `
  SELECT a.*, c.name AS contact_name, d.name AS deal_name
  FROM activities a
  LEFT JOIN contacts c ON c.id = a.contact_id
  LEFT JOIN deals d ON d.id = a.deal_id`;

export function listActivities(db: DB, opts: { contactId?: number; dealId?: number } = {}): ActivityRow[] {
  if (opts.contactId !== undefined) {
    return db
      .prepare(`${ACTIVITY_SELECT} WHERE a.contact_id = ? ORDER BY a.occurred_at DESC, a.id DESC`)
      .all(opts.contactId)
      .map(rowToActivity);
  }
  if (opts.dealId !== undefined) {
    return db
      .prepare(`${ACTIVITY_SELECT} WHERE a.deal_id = ? ORDER BY a.occurred_at DESC, a.id DESC`)
      .all(opts.dealId)
      .map(rowToActivity);
  }
  return db
    .prepare(`${ACTIVITY_SELECT} ORDER BY a.occurred_at DESC, a.id DESC`)
    .all()
    .map(rowToActivity);
}

export function createActivity(db: DB, data: any): ActivityRow {
  const description = cleanStr(data?.description, "Description", { required: true, max: 4000 });
  let type: ActivityType = "note";
  if (data?.type !== undefined && data?.type !== null && data?.type !== "") {
    if (!ACTIVITY_TYPES.includes(data.type)) throw new ApiError(400, "Type must be note, call or email");
    type = data.type;
  }
  let contactId: number | null = null;
  if (data?.contact_id !== undefined && data?.contact_id !== null && data?.contact_id !== "") {
    contactId = cleanNumber(data.contact_id, "Contact", { min: 1, max: Number.MAX_SAFE_INTEGER });
    if (!db.prepare("SELECT id FROM contacts WHERE id = ?").get(contactId)) {
      throw new ApiError(400, "Contact does not exist");
    }
  }
  let dealId: number | null = null;
  if (data?.deal_id !== undefined && data?.deal_id !== null && data?.deal_id !== "") {
    dealId = cleanNumber(data.deal_id, "Deal", { min: 1, max: Number.MAX_SAFE_INTEGER });
    if (!db.prepare("SELECT id FROM deals WHERE id = ?").get(dealId)) {
      throw new ApiError(400, "Deal does not exist");
    }
  }
  if (contactId === null && dealId === null) {
    throw new ApiError(400, "An activity must relate to a contact or a deal");
  }
  const due_date = cleanDate(data?.due_date, "Due date");
  const done = data?.done ? 1 : 0;
  let occurred_at: string | undefined;
  if (data?.occurred_at !== undefined && data?.occurred_at !== null && data?.occurred_at !== "") {
    if (typeof data?.occurred_at !== "string" || isNaN(new Date(data.occurred_at).getTime())) {
      throw new ApiError(400, "Occurred at must be a valid ISO datetime");
    }
    occurred_at = data.occurred_at;
  }
  const info = db
    .prepare(
      `INSERT INTO activities (type, contact_id, deal_id, description, due_date, done, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ','now')))`
    )
    .run(type, contactId, dealId, description, due_date, done, occurred_at ?? null);
  const row = db.prepare(`${ACTIVITY_SELECT} WHERE a.id = ?`).get(info.lastInsertRowid);
  return rowToActivity(row);
}

export function updateActivity(db: DB, id: number, data: any): ActivityRow {
  const existing = db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as Activity | undefined;
  if (!existing) throw new ApiError(404, "Activity not found");
  const description =
    data?.description !== undefined ? cleanStr(data.description, "Description", { required: true, max: 4000 }) : existing.description;
  let type = existing.type;
  if (data?.type !== undefined) {
    if (!ACTIVITY_TYPES.includes(data.type)) throw new ApiError(400, "Type must be note, call or email");
    type = data.type;
  }
  const due_date = data?.due_date !== undefined ? cleanDate(data.due_date, "Due date") : existing.due_date;
  const done = data?.done !== undefined ? (data.done ? 1 : 0) : existing.done ? 1 : 0;
  db.prepare("UPDATE activities SET description = ?, type = ?, due_date = ?, done = ? WHERE id = ?").run(
    description,
    type,
    due_date,
    done,
    id
  );
  const row = db.prepare(`${ACTIVITY_SELECT} WHERE a.id = ?`).get(id);
  return rowToActivity(row);
}

export function deleteActivity(db: DB, id: number): void {
  const info = db.prepare("DELETE FROM activities WHERE id = ?").run(id);
  if (info.changes === 0) throw new ApiError(404, "Activity not found");
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export interface DashboardData {
  kpis: {
    openCount: number;
    openValue: number;
    expectedValue: number;
    wonThisMonthCount: number;
    wonThisMonthRevenue: number;
    overdueTaskCount: number;
  };
  wonByMonth: { key: string; label: string; count: number; revenue: number }[];
  pipeline: { stage: DealStage; label: string; count: number; total: number; expected: number }[];
  recentActivities: ActivityRow[];
  tasks: ActivityRow[];
}

export function getDashboard(db: DB): DashboardData {
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Last six months (including the current one).
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" })
    });
  }

  const won = db
    .prepare("SELECT close_date, value FROM deals WHERE stage = 'won' AND close_date IS NOT NULL")
    .all() as { close_date: string; value: number }[];
  const wonByMonth = months.map((m) => {
    const inMonth = won.filter((w) => w.close_date.slice(0, 7) === m.key);
    return { ...m, count: inMonth.length, revenue: inMonth.reduce((s, w) => s + w.value, 0) };
  });

  const byStage = db
    .prepare(
      `SELECT stage, COUNT(*) AS count, COALESCE(SUM(value), 0) AS total,
        COALESCE(SUM(CASE WHEN stage NOT IN ('won','lost') THEN value * probability / 100.0 ELSE 0 END), 0) AS expected
       FROM deals GROUP BY stage`
    )
    .all() as { stage: DealStage; count: number; total: number; expected: number }[];
  const pipeline = STAGES.map((stage) => {
    const row = byStage.find((r) => r.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      count: row?.count ?? 0,
      total: row?.total ?? 0,
      expected: Math.round(row?.expected ?? 0)
    };
  });

  const openAgg = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(value), 0) AS total,
        COALESCE(SUM(value * probability / 100.0), 0) AS expected
       FROM deals WHERE stage NOT IN ('won','lost')`
    )
    .get() as { count: number; total: number; expected: number };

  const wonThisMonth = won.filter((w) => w.close_date.slice(0, 7) === thisKey);

  const today = todayISO();
  const overdueTaskCount = (
    db.prepare("SELECT COUNT(*) AS n FROM activities WHERE due_date IS NOT NULL AND done = 0 AND due_date < ?").get(today) as { n: number }
  ).n;

  const recentActivities = listActivities(db).slice(0, 10);

  const tasks = db
    .prepare(
      `SELECT a.*, c.name AS contact_name, d.name AS deal_name
       FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN deals d ON d.id = a.deal_id
       WHERE a.due_date IS NOT NULL AND a.done = 0
       ORDER BY a.due_date ASC, a.id ASC
       LIMIT 25`
    )
    .all()
    .map(rowToActivity);

  return {
    kpis: {
      openCount: openAgg.count,
      openValue: openAgg.total,
      expectedValue: Math.round(openAgg.expected),
      wonThisMonthCount: wonThisMonth.length,
      wonThisMonthRevenue: wonThisMonth.reduce((s, w) => s + w.value, 0),
      overdueTaskCount
    },
    wonByMonth,
    pipeline,
    recentActivities,
    tasks
  };
}
