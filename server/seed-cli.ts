import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { openDb } from "./db";
import { seed } from "./seed";

const dbFile = process.env.CRM_DB || fileURLToPath(new URL("../data/crm.db", import.meta.url));

// Remove the existing database file (and WAL companions), then recreate + seed.
for (const suffix of ["", "-wal", "-shm"]) {
  try {
    fs.unlinkSync(dbFile + suffix);
  } catch {
    /* ignore */
  }
}

const db = openDb(dbFile);
seed(db);
console.log(`Reset complete — fresh sample data written to ${dbFile}`);
