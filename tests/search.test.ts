import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "../server/db";
import * as repo from "../server/repo";

let db: DB;

beforeEach(() => {
  db?.close();
  db = openDb(":memory:");
});

describe("search", () => {
  beforeEach(() => {
    repo.createOrganization(db, { name: "Northwind Logistics", industry: "Transportation" });
    repo.createOrganization(db, { name: "Bluepeak Software", industry: "Technology" });
    repo.createOrganization(db, { name: "Acme Manufacturing", industry: "Manufacturing" });

    repo.createContact(db, { name: "Maria Chen", email: "maria@northwind.com", title: "VP Operations" });
    repo.createContact(db, { name: "James Okafor", email: "james@bluepeak.io", title: "CTO" });
    repo.createContact(db, { name: "Elena Petrova", email: "elena@acme.com", title: "Director" });

    const org = repo.listOrganizations(db).find((o) => o.name === "Acme Manufacturing")!;
    repo.createDeal(db, { name: "Warehouse automation", organization_id: org.id, value: 1000 });
    repo.createDeal(db, { name: "Fleet tracking rollout", organization_id: org.id, value: 2000 });
  });

  it("finds organizations by name (case-insensitive substring)", () => {
    expect(repo.listOrganizations(db, "northwind").map((o) => o.name)).toEqual(["Northwind Logistics"]);
    expect(repo.listOrganizations(db, "BLUE")).toHaveLength(1);
    expect(repo.listOrganizations(db, "zzz")).toHaveLength(0);
  });

  it("finds organizations by industry", () => {
    expect(repo.listOrganizations(db, "manufacturing").map((o) => o.name)).toEqual(["Acme Manufacturing"]);
  });

  it("finds contacts by name", () => {
    expect(repo.listContacts(db, { search: "maria" }).map((c) => c.name)).toEqual(["Maria Chen"]);
  });

  it("finds contacts by email", () => {
    expect(repo.listContacts(db, { search: "bluepeak.io" }).map((c) => c.name)).toEqual(["James Okafor"]);
  });

  it("finds contacts by job title", () => {
    expect(repo.listContacts(db, { search: "director" }).map((c) => c.name)).toEqual(["Elena Petrova"]);
  });

  it("filters contacts by status", () => {
    repo.updateContact(db, repo.listContacts(db, { search: "maria" })[0].id, { status: "customer" });
    expect(repo.listContacts(db, { status: "customer" }).map((c) => c.name)).toEqual(["Maria Chen"]);
    expect(repo.listContacts(db, { status: "lead" })).toHaveLength(2);
    expect(repo.listContacts(db, { status: "customer", search: "james" })).toHaveLength(0);
  });

  it("rejects an invalid status filter", () => {
    expect(() => repo.listContacts(db, { status: "bogus" })).toThrowError(/status/i);
  });

  it("finds deals by deal name and by organization name", () => {
    expect(repo.listDeals(db, { search: "warehouse" }).map((d) => d.name)).toEqual(["Warehouse automation"]);
    expect(repo.listDeals(db, { search: "acme" })).toHaveLength(2);
  });

  it("filters deals by stage", () => {
    const deal = repo.listDeals(db, { search: "warehouse" })[0];
    repo.updateDeal(db, deal.id, { stage: "won" });
    expect(repo.listDeals(db, { stage: "won" })).toHaveLength(1);
    expect(repo.listDeals(db, { stage: "new" })).toHaveLength(1);
  });

  it("treats search special characters literally", () => {
    repo.createContact(db, { name: "100% Cotton", email: "cotton@example.com" });
    expect(repo.listContacts(db, { search: "%" }).map((c) => c.name)).toEqual(["100% Cotton"]);
  });
});
