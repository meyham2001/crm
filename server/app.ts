import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DB } from "./db";
import { ApiError, STAGES, STATUSES } from "./repo";
import * as repo from "./repo";

const num = (v: unknown): number => Number(v);

/** Build the Express app around a given database connection. */
export function createApp(db: DB): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  const api = express.Router();

  /* ---------------- Organizations ---------------- */
  api.get("/organizations", (req, res) => {
    res.json(repo.listOrganizations(db, req.query.search as string | undefined));
  });
  api.post("/organizations", (req, res) => {
    res.status(201).json(repo.createOrganization(db, req.body));
  });
  api.get("/organizations/:id", (req, res) => {
    res.json(repo.getOrganization(db, num(req.params.id)));
  });
  api.patch("/organizations/:id", (req, res) => {
    res.json(repo.updateOrganization(db, num(req.params.id), req.body));
  });
  api.delete("/organizations/:id", (req, res) => {
    repo.deleteOrganization(db, num(req.params.id));
    res.status(204).end();
  });

  /* ---------------- Contacts ---------------- */
  api.get("/contacts", (req, res) => {
    res.json(
      repo.listContacts(db, {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined
      })
    );
  });
  api.post("/contacts", (req, res) => {
    res.status(201).json(repo.createContact(db, req.body));
  });
  api.get("/contacts/:id", (req, res) => {
    res.json(repo.getContact(db, num(req.params.id)));
  });
  api.patch("/contacts/:id", (req, res) => {
    res.json(repo.updateContact(db, num(req.params.id), req.body));
  });
  api.delete("/contacts/:id", (req, res) => {
    repo.deleteContact(db, num(req.params.id));
    res.status(204).end();
  });

  /* ---------------- Deals ---------------- */
  api.get("/deals", (req, res) => {
    res.json(
      repo.listDeals(db, {
        search: req.query.search as string | undefined,
        stage: req.query.stage as string | undefined
      })
    );
  });
  api.post("/deals", (req, res) => {
    res.status(201).json(repo.createDeal(db, req.body));
  });
  api.get("/deals/:id", (req, res) => {
    res.json(repo.getDeal(db, num(req.params.id)));
  });
  api.patch("/deals/:id", (req, res) => {
    res.json(repo.updateDeal(db, num(req.params.id), req.body));
  });
  api.delete("/deals/:id", (req, res) => {
    repo.deleteDeal(db, num(req.params.id));
    res.status(204).end();
  });

  /* ---------------- Activities ---------------- */
  api.get("/activities", (req, res) => {
    res.json(
      repo.listActivities(db, {
        contactId: req.query.contact_id ? num(req.query.contact_id) : undefined,
        dealId: req.query.deal_id ? num(req.query.deal_id) : undefined
      })
    );
  });
  api.post("/activities", (req, res) => {
    res.status(201).json(repo.createActivity(db, req.body));
  });
  api.patch("/activities/:id", (req, res) => {
    res.json(repo.updateActivity(db, num(req.params.id), req.body));
  });
  api.delete("/activities/:id", (req, res) => {
    repo.deleteActivity(db, num(req.params.id));
    res.status(204).end();
  });

  /* ---------------- Dashboard & meta ---------------- */
  api.get("/dashboard", (_req, res) => {
    res.json(repo.getDashboard(db));
  });
  api.get("/meta", (_req, res) => {
    res.json({ stages: STAGES, statuses: STATUSES });
  });

  app.use("/api", api);

  /* ---------------- Static frontend ---------------- */
  const distDir = path.resolve(fileURLToPath(new URL("../dist", import.meta.url)));
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => {
      res
        .status(200)
        .send("Personal CRM API is running. Frontend build not found — run `npm run build` (or use `npm run dev`).");
    });
  }

  /* ---------------- Error handling ---------------- */
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    if (err?.code === "SQLITE_CONSTRAINT") {
      res.status(400).json({ error: "Invalid data" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
