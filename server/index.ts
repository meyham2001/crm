import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { openDb } from "./db";
import { createApp } from "./app";
import { seedIfEmpty } from "./seed";

const dbFile = process.env.CRM_DB || fileURLToPath(new URL("../data/crm.db", import.meta.url));
const db = openDb(dbFile);

if (seedIfEmpty(db)) {
  console.log(`Seeded sample data into ${path.basename(dbFile)}`);
}

const port = Number(process.env.PORT || 3000);
const app = createApp(db);
const server = http.createServer(app);

function announce() {
  console.log("");
  console.log("  Personal CRM is running");
  console.log(`  →  http://localhost:${port}`);
  console.log("");
  console.log(`  Database: ${dbFile}`);
  console.log("");
}

// Bind dual-stack (IPv6 + IPv4) so the app is reachable both inside the
// container and through dev-container port forwarding on the host.
// On machines without IPv6, fall back to IPv4-only.
server.once("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other process or run with PORT=<other>.`);
    process.exit(1);
  }
  if (err.code === "EAFNOSUPPORT" || err.code === "EADDRNOTAVAIL" || err.code === "EINVAL") {
    server.once("error", (e2) => {
      console.error(e2);
      process.exit(1);
    });
    server.listen(port, "0.0.0.0", announce);
  } else {
    console.error(err);
    process.exit(1);
  }
});
server.listen(port, "::", announce);
