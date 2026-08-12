import express from "express";
import type { Request, Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { openDb } from "./db.ts";
import { seed } from "./seed.ts";
import * as repo from "./repo.ts";
import type { ActivityInput, ContactInput, DealInput, OrganizationInput } from "../shared/types.ts";

export type { DashboardStats } from "../shared/types.ts";

export function createApiApp(dbOrFile: DatabaseSync | string = resolve("data/crm.db")): express.Express {
  const db = typeof dbOrFile === "string" ? openDb(dbOrFile) : dbOrFile;
  const app = express();
  app.use(express.json());
  seed(db);

  const wrap =
    (fn: (req: Request, res: Response) => unknown) =>
    (req: Request, res: Response) => {
      try {
        const result = fn(req, res);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(err);
            res.status(500).json({ error: "Internal server error" });
          });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    };

  const parseId = (req: Request, res: Response): number | null => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return null;
    }
    return id;
  };

  // ----- Organizations -----
  app.get("/orgs", wrap((req, res) => res.json(repo.listOrganizations(db, String(req.query.search ?? "")))));
  app.get("/orgs/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const org = repo.getOrganization(db, id);
    if (!org) return void res.status(404).json({ error: "Not found" });
    const contacts = repo.listContacts(db, {});
    const deals = repo.listDeals(db, { organizationId: id });
    res.json({ ...org, contacts: contacts.filter((c) => c.organization_id === id), deals });
  }));
  app.post("/orgs", wrap((req, res) => {
    const input = req.body as OrganizationInput;
    if (!input?.name?.trim()) return void res.status(400).json({ error: "Name is required" });
    res.status(201).json(repo.createOrganization(db, { ...input, name: input.name.trim() }));
  }));
  app.put("/orgs/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const input = req.body as OrganizationInput;
    if (!input?.name?.trim()) return void res.status(400).json({ error: "Name is required" });
    const updated = repo.updateOrganization(db, id, { ...input, name: input.name.trim() });
    if (!updated) return void res.status(404).json({ error: "Not found" });
    res.json(updated);
  }));
  app.delete("/orgs/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (!repo.deleteOrganization(db, id)) return void res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  }));

  // ----- Contacts -----
  app.get("/contacts", wrap((req, res) =>
    res.json(repo.listContacts(db, { search: String(req.query.search ?? ""), status: String(req.query.status ?? "all") }))
  ));
  app.get("/contacts/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const contact = repo.getContact(db, id);
    if (!contact) return void res.status(404).json({ error: "Not found" });
    const deals = repo.listDeals(db, { contactId: id });
    const activities = repo.listActivitiesForContact(db, id);
    res.json({ ...contact, deals, activities });
  }));
  app.post("/contacts", wrap((req, res) => {
    const input = req.body as ContactInput;
    if (!input?.name?.trim()) return void res.status(400).json({ error: "Name is required" });
    res.status(201).json(repo.createContact(db, { ...input, name: input.name.trim() }));
  }));
  app.put("/contacts/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const input = req.body as ContactInput;
    if (!input?.name?.trim()) return void res.status(400).json({ error: "Name is required" });
    const updated = repo.updateContact(db, id, { ...input, name: input.name.trim() });
    if (!updated) return void res.status(404).json({ error: "Not found" });
    res.json(updated);
  }));
  app.delete("/contacts/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (!repo.deleteContact(db, id)) return void res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  }));

  // ----- Deals -----
  app.get("/deals", wrap((req, res) => {
    const contactId = Number(req.query.contactId ?? 0) || undefined;
    const organizationId = Number(req.query.organizationId ?? 0) || undefined;
    res.json(repo.listDeals(db, { search: String(req.query.search ?? ""), stage: String(req.query.stage ?? "all"), contactId, organizationId }));
  }));
  app.get("/deals/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const deal = repo.getDeal(db, id);
    if (!deal) return void res.status(404).json({ error: "Not found" });
    const activities = repo.listActivitiesForDeal(db, id);
    res.json({ ...deal, activities });
  }));
  app.post("/deals", wrap((req, res) => {
    const input = req.body as DealInput;
    if (!input?.name?.trim()) return void res.status(400).json({ error: "Name is required" });
    res.status(201).json(repo.createDeal(db, { ...input, name: input.name.trim() }));
  }));
  app.put("/deals/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const input = req.body as DealInput;
    if (!input?.name?.trim()) return void res.status(400).json({ error: "Name is required" });
    const updated = repo.updateDeal(db, id, { ...input, name: input.name.trim() });
    if (!updated) return void res.status(404).json({ error: "Not found" });
    res.json(updated);
  }));
  app.patch("/deals/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const input = req.body as Partial<DealInput>;
    if (!input || Object.keys(input).length === 0) return void res.status(400).json({ error: "No fields to update" });
    const current = repo.getDeal(db, id);
    if (!current) return void res.status(404).json({ error: "Not found" });
    const merged: DealInput = {
      organization_id: input.organization_id ?? current.organization_id,
      contact_id: input.contact_id !== undefined ? input.contact_id : (current.contact_id ?? null),
      name: input.name ?? current.name,
      stage: input.stage ?? current.stage,
      value: input.value ?? current.value,
      probability: input.probability ?? current.probability,
      close_date: input.close_date !== undefined ? input.close_date : (current.close_date ?? null),
    };
    const updated = repo.updateDeal(db, id, merged);
    if (!updated) return void res.status(404).json({ error: "Not found" });
    res.json(updated);
  }));
  app.delete("/deals/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (!repo.deleteDeal(db, id)) return void res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  }));

  // ----- Activities -----
  app.get("/activities", wrap((req, res) => {
    const contactId = Number(req.query.contactId ?? 0) || undefined;
    const dealId = Number(req.query.dealId ?? 0) || undefined;
    if (contactId) return res.json(repo.listActivitiesForContact(db, contactId));
    if (dealId) return res.json(repo.listActivitiesForDeal(db, dealId));
    return res.json(repo.listAllActivities(db, 100));
  }));
  app.post("/activities", wrap((req, res) => {
    const input = req.body as ActivityInput;
    if (!input?.description?.trim()) return void res.status(400).json({ error: "Description is required" });
    res.status(201).json(repo.createActivity(db, { ...input, description: input.description.trim() }));
  }));
  app.patch("/activities/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const input = req.body as Partial<ActivityInput>;
    const updated = repo.updateActivity(db, id, input);
    if (!updated) return void res.status(404).json({ error: "Not found" });
    res.json(updated);
  }));
  app.delete("/activities/:id", wrap((req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (!repo.deleteActivity(db, id)) return void res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  }));

  // ----- Dashboard -----
  app.get("/dashboard", wrap((_req, res) => res.json(repo.dashboardStats(db))));

  return app;
}