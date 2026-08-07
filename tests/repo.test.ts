import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "../server/db";
import * as repo from "../server/repo";

let db: DB;

beforeEach(() => {
  db?.close();
  db = openDb(":memory:");
});

/* ------------------------------------------------------------------ */
/* Organizations CRUD                                                  */
/* ------------------------------------------------------------------ */

describe("organizations CRUD", () => {
  it("creates, reads, updates and deletes an organization", () => {
    const created = repo.createOrganization(db, {
      name: "Testco",
      website: "testco.com",
      industry: "Software",
      notes: "A test company"
    });
    expect(created.id).toBeTypeOf("number");
    expect(created.name).toBe("Testco");

    const fetched = repo.getOrganization(db, created.id);
    expect(fetched.name).toBe("Testco");
    expect(fetched.website).toBe("testco.com");
    expect(fetched.contacts).toEqual([]);
    expect(fetched.deals).toEqual([]);

    const updated = repo.updateOrganization(db, created.id, { name: "Testco Inc.", industry: "Hardware" });
    expect(updated.name).toBe("Testco Inc.");
    expect(updated.industry).toBe("Hardware");
    expect(updated.website).toBe("testco.com"); // untouched fields preserved

    repo.deleteOrganization(db, created.id);
    expect(() => repo.getOrganization(db, created.id)).toThrowError(/not found/i);
  });

  it("requires a name", () => {
    expect(() => repo.createOrganization(db, { name: "   " })).toThrowError(/name is required/i);
  });

  it("lists organizations with contact/deal counts", () => {
    const org = repo.createOrganization(db, { name: "Counted Co" });
    repo.createContact(db, { name: "Jane Doe", organization_id: org.id });
    repo.createDeal(db, { name: "Big deal", organization_id: org.id, value: 1000 });
    const rows = repo.listOrganizations(db);
    const row = rows.find((r) => r.id === org.id)!;
    expect(row.contact_count).toBe(1);
    expect(row.deal_count).toBe(1);
    expect(row.open_value).toBe(1000);
  });
});

/* ------------------------------------------------------------------ */
/* Contacts CRUD                                                       */
/* ------------------------------------------------------------------ */

describe("contacts CRUD", () => {
  it("creates, reads, updates and deletes a contact", () => {
    const org = repo.createOrganization(db, { name: "Acme" });
    const created = repo.createContact(db, {
      name: "Jane Doe",
      email: "jane@acme.com",
      phone: "555-0100",
      title: "CTO",
      organization_id: org.id,
      status: "lead"
    });
    expect(created.organization_name).toBe("Acme");

    const fetched = repo.getContact(db, created.id);
    expect(fetched.email).toBe("jane@acme.com");
    expect(fetched.activities).toEqual([]);

    const updated = repo.updateContact(db, created.id, { status: "customer", title: "CEO" });
    expect(updated.status).toBe("customer");
    expect(updated.title).toBe("CEO");

    repo.deleteContact(db, created.id);
    expect(() => repo.getContact(db, created.id)).toThrowError(/not found/i);
  });

  it("rejects an invalid status", () => {
    expect(() => repo.createContact(db, { name: "X", status: "vip" })).toThrowError(/status/i);
  });

  it("rejects a nonexistent organization", () => {
    expect(() => repo.createContact(db, { name: "X", organization_id: 999 })).toThrowError(/organization/i);
  });

  it("keeps contacts when their organization is deleted (org set to null)", () => {
    const org = repo.createOrganization(db, { name: "Vanishing Co" });
    const contact = repo.createContact(db, { name: "Survivor", organization_id: org.id });
    repo.deleteOrganization(db, org.id);
    const fetched = repo.getContact(db, contact.id);
    expect(fetched.organization_id).toBeNull();
    expect(fetched.organization_name).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Deals CRUD                                                          */
/* ------------------------------------------------------------------ */

describe("deals CRUD", () => {
  it("creates, reads, updates and deletes a deal", () => {
    const org = repo.createOrganization(db, { name: "BuyerCo" });
    const contact = repo.createContact(db, { name: "Buyer One", organization_id: org.id });
    const created = repo.createDeal(db, {
      name: "Annual license",
      organization_id: org.id,
      contact_id: contact.id,
      stage: "proposal",
      value: 42000,
      probability: 55,
      close_date: "2027-03-15"
    });
    expect(created.organization_name).toBe("BuyerCo");
    expect(created.contact_name).toBe("Buyer One");

    const fetched = repo.getDeal(db, created.id);
    expect(fetched.value).toBe(42000);
    expect(fetched.probability).toBe(55);

    const updated = repo.updateDeal(db, created.id, { value: 50000, probability: 65 });
    expect(updated.value).toBe(50000);
    expect(updated.probability).toBe(65);
    expect(updated.stage).toBe("proposal");

    repo.deleteDeal(db, created.id);
    expect(() => repo.getDeal(db, created.id)).toThrowError(/not found/i);
  });

  it("rejects invalid stages and out-of-range values", () => {
    expect(() => repo.createDeal(db, { name: "Bad", stage: "maybe" })).toThrowError(/stage/i);
    expect(() => repo.createDeal(db, { name: "Bad", value: -5 })).toThrowError(/value/i);
    expect(() => repo.createDeal(db, { name: "Bad", probability: 150 })).toThrowError(/probability/i);
    expect(() => repo.createDeal(db, { name: "Bad", close_date: "15/03/2027" })).toThrowError(/close date/i);
  });

  it("deletes a deal's activities when the deal is deleted", () => {
    const deal = repo.createDeal(db, { name: "With activity" });
    repo.createActivity(db, { deal_id: deal.id, description: "note" });
    expect(repo.listActivities(db, { dealId: deal.id })).toHaveLength(1);
    repo.deleteDeal(db, deal.id);
    expect(repo.listActivities(db)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Activities CRUD                                                     */
/* ------------------------------------------------------------------ */

describe("activities CRUD", () => {
  it("creates, reads, updates and deletes an activity", () => {
    const contact = repo.createContact(db, { name: "Talker" });
    const created = repo.createActivity(db, {
      type: "call",
      contact_id: contact.id,
      description: "Intro call",
      due_date: "2027-01-31",
      done: false
    });
    expect(created.contact_name).toBe("Talker");
    expect(created.done).toBe(false);

    const updated = repo.updateActivity(db, created.id, { done: true, description: "Intro call — went well" });
    expect(updated.done).toBe(true);
    expect(updated.description).toBe("Intro call — went well");

    repo.deleteActivity(db, created.id);
    expect(() => repo.updateActivity(db, created.id, { done: false })).toThrowError(/not found/i);
  });

  it("requires a contact or a deal", () => {
    expect(() => repo.createActivity(db, { description: "orphan" })).toThrowError(/contact or a deal/i);
  });

  it("requires a description and a valid type", () => {
    const contact = repo.createContact(db, { name: "X" });
    expect(() => repo.createActivity(db, { contact_id: contact.id, description: "" })).toThrowError(/description/i);
    expect(() => repo.createActivity(db, { contact_id: contact.id, description: "x", type: "fax" })).toThrowError(/type/i);
  });

  it("lists activities newest first", () => {
    const contact = repo.createContact(db, { name: "Chrono" });
    const older = repo.createActivity(db, {
      contact_id: contact.id,
      description: "older",
      occurred_at: "2020-01-01T00:00:00.000Z"
    });
    expect(older.occurred_at).toBe("2020-01-01T00:00:00.000Z");
    repo.createActivity(db, { contact_id: contact.id, description: "newer" });
    const list = repo.listActivities(db, { contactId: contact.id });
    expect(list.map((a) => a.description)).toEqual(["newer", "older"]);
  });
});
