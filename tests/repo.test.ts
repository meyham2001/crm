import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openDb } from "../server/db.ts";
import { seed } from "../server/seed.ts";
import * as repo from "../server/repo.ts";

let db: DatabaseSync;

beforeEach(() => {
  db = openDb(":memory:");
  seed(db);
});

afterEach(() => {
  db.close();
});

describe("seed data", () => {
  it("fills every table with realistic sample data", () => {
    expect(repo.listOrganizations(db).length).toBeGreaterThanOrEqual(5);
    expect(repo.listContacts(db).length).toBeGreaterThanOrEqual(10);
    const deals = repo.listDeals(db);
    expect(deals.length).toBeGreaterThanOrEqual(10);
    const stages = new Set(deals.map((d) => d.stage));
    for (const s of ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]) {
      expect(stages.has(s), `deals must exist in stage ${s}`).toBe(true);
    }
    const acts = repo.listAllActivities(db);
    expect(acts.length).toBeGreaterThanOrEqual(15);
    expect(repo.listTasks(db).length).toBeGreaterThan(0);
  });
});

describe("organizations CRUD", () => {
  it("creates, reads, updates and deletes an organization", () => {
    const created = repo.createOrganization(db, { name: "Acme Corp", website: "acme.com", industry: "Software", notes: "New lead" });
    expect(created.id).toBeGreaterThan(0);
    const read = repo.getOrganization(db, created.id);
    expect(read?.name).toBe("Acme Corp");
    expect(read?.contact_count).toBe(0);

    const updated = repo.updateOrganization(db, created.id, { name: "Acme Corporation", website: "acme.io" });
    expect(updated?.name).toBe("Acme Corporation");
    expect(repo.getOrganization(db, created.id)?.website).toBe("acme.io");

    expect(repo.deleteOrganization(db, created.id)).toBe(true);
    expect(repo.getOrganization(db, created.id)).toBeUndefined();
  });

  it("searches organizations by name, industry and website", () => {
    const byName = repo.listOrganizations(db, "northwind");
    expect(byName.length).toBe(1);
    expect(byName[0].name).toContain("Northwind");

    const byIndustry = repo.listOrganizations(db, "logistics");
    expect(byIndustry.some((o) => o.industry === "Logistics")).toBe(true);

    const byWebsite = repo.listOrganizations(db, "fenwickrobotics");
    expect(byWebsite.length).toBe(1);

    expect(repo.listOrganizations(db, "zzz-no-match")).toHaveLength(0);
    expect(repo.listOrganizations(db, "")).toHaveLength(repo.listOrganizations(db).length);
  });

  it("deleting an organization cascades to its deals", () => {
    const org = repo.listOrganizations(db)[0];
    const dealsBefore = repo.listDeals(db).filter((d) => d.organization_id === org.id).length;
    expect(dealsBefore).toBeGreaterThan(0);
    repo.deleteOrganization(db, org.id);
    expect(repo.listDeals(db).filter((d) => d.organization_id === org.id)).toHaveLength(0);
  });
});

describe("contacts CRUD", () => {
  it("creates, reads, updates and deletes a contact", () => {
    const org = repo.listOrganizations(db)[0];
    const created = repo.createContact(db, {
      organization_id: org.id,
      name: "Jane Doe",
      email: "jane@acme.com",
      phone: "555-0100",
      job_title: "CTO",
      status: "qualified",
    });
    expect(created.id).toBeGreaterThan(0);
    expect(repo.getContact(db, created.id)?.email).toBe("jane@acme.com");
    expect(repo.getContact(db, created.id)?.organization_name).toBe(org.name);

    const updated = repo.updateContact(db, created.id, { name: "Jane Doe II", status: "customer", organization_id: null });
    expect(updated?.status).toBe("customer");
    expect(repo.getContact(db, created.id)?.organization_id).toBeNull();

    expect(repo.deleteContact(db, created.id)).toBe(true);
    expect(repo.getContact(db, created.id)).toBeUndefined();
  });

  it("searches contacts by name and email", () => {
    const byName = repo.listContacts(db, { search: "amara" });
    expect(byName.length).toBe(1);
    expect(byName[0].name).toBe("Amara Okafor");

    const byEmail = repo.listContacts(db, { search: "priya@brightline" });
    expect(byEmail.length).toBe(1);

    const byOrg = repo.listContacts(db, { search: "solstice" });
    expect(byOrg.some((c) => c.organization_name === "Solstice Energy")).toBe(true);
  });

  it("filters contacts by status", () => {
    const leads = repo.listContacts(db, { status: "lead" });
    expect(leads.length).toBeGreaterThan(0);
    expect(leads.every((c) => c.status === "lead")).toBe(true);

    const customers = repo.listContacts(db, { status: "customer" });
    expect(customers.length).toBeGreaterThan(0);
    expect(customers.every((c) => c.status === "customer")).toBe(true);

    const all = repo.listContacts(db, { status: "all" });
    expect(all.length).toBe(repo.listContacts(db).length);
  });

  it("combines search and status filter", () => {
    const r = repo.listContacts(db, { search: "lead", status: "lead" });
    expect(r.every((c) => c.status === "lead")).toBe(true);
  });
});

describe("deals CRUD", () => {
  it("creates, reads, updates and deletes a deal", () => {
    const org = repo.listOrganizations(db)[0];
    const contact = repo.listContacts(db)[0];
    const created = repo.createDeal(db, {
      organization_id: org.id,
      contact_id: contact.id,
      name: "Big Deal",
      stage: "New",
      value: 100000,
      probability: 20,
      close_date: "2026-12-01T00:00:00",
    });
    expect(created.id).toBeGreaterThan(0);
    const read = repo.getDeal(db, created.id);
    expect(read?.name).toBe("Big Deal");
    expect(read?.organization_name).toBe(org.name);
    expect(read?.contact_name).toBe(contact.name);
    expect(read?.expected_value).toBe(20000);

    repo.updateDeal(db, created.id, { name: "Bigger Deal", value: 200000, probability: 50, organization_id: org.id });
    expect(repo.getDeal(db, created.id)?.value).toBe(200000);
    expect(repo.getDeal(db, created.id)?.expected_value).toBe(100000);

    expect(repo.deleteDeal(db, created.id)).toBe(true);
    expect(repo.getDeal(db, created.id)).toBeUndefined();
  });

  it("searches deals by name, organization and contact", () => {
    expect(repo.listDeals(db, { search: "warehouse management" }).length).toBe(1);
    expect(repo.listDeals(db, { search: "solstice" }).length).toBeGreaterThanOrEqual(2);
    const byContact = repo.listDeals(db, { search: "amara okafor" });
    expect(byContact.some((d) => d.contact_name === "Amara Okafor")).toBe(true);
  });

  it("changes a deal's stage to each stage including Won and Lost", () => {
    const deal = repo.listDeals(db, { stage: "New" })[0];
    for (const stage of ["Qualified", "Proposal", "Negotiation", "Won", "Lost", "New"]) {
      const changed = repo.changeDealStage(db, deal.id, stage);
      expect(changed?.stage).toBe(stage);
      expect(repo.getDeal(db, deal.id)?.stage).toBe(stage);
    }
    expect(() => repo.changeDealStage(db, deal.id, "NotAStage")).toThrow();
  });

  it("sets probability to 100 on Won and 0 on Lost", () => {
    const deal = repo.listDeals(db, { stage: "New" })[0];
    const won = repo.changeDealStage(db, deal.id, "Won");
    expect(won?.probability).toBe(100);
    expect(repo.getDeal(db, deal.id)?.expected_value).toBe(repo.getDeal(db, deal.id)?.value);
    const lost = repo.changeDealStage(db, deal.id, "Lost");
    expect(lost?.probability).toBe(0);
    expect(repo.getDeal(db, deal.id)?.expected_value).toBe(0);
  });

  it("rejects a deal without an organization", () => {
    expect(() => repo.createDeal(db, { organization_id: 9999, name: "Orphan" })).toThrow();
  });
});

describe("activities and tasks", () => {
  it("adds an activity (note, call, email) to a contact and a deal", () => {
    const contact = repo.listContacts(db)[0];
    const settled = repo.listDeals(db)[0];

    const note = repo.createActivity(db, { contact_id: contact.id, type: "note", description: "Quick catch-up" });
    const call = repo.createActivity(db, { contact_id: contact.id, deal_id: settled.id, type: "call", description: "Demo call done" });
    const email = repo.createActivity(db, { deal_id: settled.id, type: "email", description: "Sent proposal" });

    expect(repo.listActivitiesForContact(db, contact.id).map((a) => a.id)).toContain(note.id);
    expect(repo.listActivitiesForContact(db, contact.id).map((a) => a.id)).toContain(call.id);
    expect(repo.listActivitiesForDeal(db, settled.id).map((a) => a.id)).toContain(call.id);
    expect(repo.listActivitiesForDeal(db, settled.id).map((a) => a.id)).toContain(email.id);
  });

  it("activity optional due date makes it a task that can be toggled done", () => {
    const contact = repo.listContacts(db)[0];
    const due = repo.createActivity(db, {
      contact_id: contact.id,
      type: "email",
      description: "Follow up on pricing",
      due_date: new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 19),
    });
    const noDue = repo.createActivity(db, { contact_id: contact.id, type: "note", description: "No due date" });

    const tasks = repo.listTasks(db);
    expect(tasks.map((t) => t.id)).toContain(due.id);
    expect(tasks.map((t) => t.id)).not.toContain(noDue.id);
    expect(tasks.find((t) => t.id === due.id)?.done).toBe(0);
    expect(tasks.find((t) => t.id === due.id)?.overdue).toBe(0);

    const toggled = repo.setActivityDone(db, due.id, true);
    expect(toggled?.done).toBe(1);
    expect(repo.listTasks(db).map((t) => t.id)).not.toContain(due.id);

    const untoggled = repo.setActivityDone(db, due.id, false);
    expect(untoggled?.done).toBe(0);
    expect(repo.listTasks(db).map((t) => t.id)).toContain(due.id);
  });

  it("marks overdue tasks", () => {
    const contact = repo.listContacts(db)[0];
    const overdue = repo.createActivity(db, {
      contact_id: contact.id,
      type: "call",
      description: "Should have called yesterday",
      due_date: new Date(Date.now() - 86400_000).toISOString().slice(0, 19),
    });
    const t = repo.listTasks(db).find((x) => x.id === overdue.id);
    expect(t?.overdue).toBe(1);
  });

  it("deletes an activity", () => {
    const contact = repo.listContacts(db)[0];
    const a = repo.createActivity(db, { contact_id: contact.id, type: "note", description: "Delete me" });
    expect(repo.deleteActivity(db, a.id)).toBe(true);
    expect(repo.listActivitiesForContact(db, contact.id).map((x) => x.id)).not.toContain(a.id);
  });
});

describe("dashboard stats", () => {
  it("counts won deals and revenue per month", () => {
    const stats = repo.dashboardStats(db);
    expect(stats.wonCount).toBeGreaterThanOrEqual(5);
    expect(stats.wonValue).toBeGreaterThan(0);
    expect(stats.wonByMonth.length).toBe(6);
    const totalFromPoints = stats.wonByMonth.reduce((s, p) => s + p.count, 0);
    expect(totalFromPoints).toBe(stats.wonCount);
  });

  it("computes pipeline summary by stage with expected revenue", () => {
    const summary = repo.pipelineSummary(db);
    expect(summary).toHaveLength(6);
    for (const s of summary) {
      if (s.stage === "Won") expect(s.expected).toBe(s.value);
      if (s.stage === "New") expect(s.expected).toBeLessThan(s.value);
    }
    const won = summary.find((s) => s.stage === "Won");
    expect(won?.count).toBeGreaterThan(0);
  });

  it("dashboard reflects a newly won deal and new task on refresh", () => {
    const before = repo.dashboardStats(db);
    const org = repo.listOrganizations(db)[0];
    const contact = repo.listContacts(db)[0];
    const now = new Date().toISOString().slice(0, 19);
    repo.createDeal(db, { organization_id: org.id, contact_id: contact.id, name: "Fresh Win", stage: "Won", value: 50000, probability: 100, close_date: now });
    const contactId = repo.listContacts(db)[1].id;
    repo.createActivity(db, { contact_id: contactId, type: "email", description: "Due soon", due_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 19) });

    const after = repo.dashboardStats(db);
    expect(after.wonCount).toBe(before.wonCount + 1);
    expect(after.wonValue).toBe(before.wonValue + 50000);
    expect(after.taskDueCount).toBe(before.taskDueCount + 1);
  });
});

describe("persistence", () => {
  it("changes survive a database close and reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "crm-test-"));
    const file = join(dir, "test.db");
    try {
      const db1 = openDb(file);
      seed(db1);
      const created = repo.createOrganization(db1, { name: "Persistent Co" });
      const dealId = repo.listDeals(db1, { stage: "New" })[0].id;
      repo.changeDealStage(db1, dealId, "Won");
      const activity = repo.createActivity(db1, { contact_id: repo.listContacts(db1)[0].id, type: "call", description: "Persisted", due_date: "2030-05-01T00:00:00" });
      repo.setActivityDone(db1, activity.id, true);
      db1.close();

      const db2 = openDb(file);
      expect(repo.getOrganization(db2, created.id)?.name).toBe("Persistent Co");
      expect(repo.getDeal(db2, dealId)?.stage).toBe("Won");
      const task = repo.listTasks(db2).find((t) => t.id === activity.id);
      expect(task).toBeUndefined();
      db2.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});