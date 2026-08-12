import express from "express";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createApiApp } from "./app.ts";

const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? "0.0.0.0";
const dbFile = process.env.CRM_DB ?? resolve("data/crm.db");

const api = createApiApp(resolve(dbFile));
const app = express();
app.use("/api", api);

const dist = resolve("dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(dist, "index.html"));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`Personal CRM running at http://localhost:${PORT} (db: ${dbFile})`);
});