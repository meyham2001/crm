# Personal CRM

A simple, private sales CRM that runs entirely on your own machine — your own
local Salesforce. Track organizations, contacts, deals, and activities; drag
deals through a visual pipeline; get a dashboard that keeps honest score.
No login, no accounts, no cloud. Data lives in a local SQLite file.

## Start the app

```bash
npm install
npm start
```

Open **<http://localhost:4321>** in your browser. That's it.

- `npm start` builds the frontend and starts the server (API + app) on port 4321.
- `npm run dev` runs the Vite dev server with hot reload (same URL, same port).
- `npm run test` runs the unit test suite (Vitest).
- `npm run typecheck` runs the TypeScript compiler.

The app comes pre-loaded with realistic sample data on first launch. All data
is stored in `data/crm.db`; delete that file and restart to start fresh.

## What's inside

- **Dashboard** — deals won per month, revenue won per month, pipeline
  overview with expected revenue (value × probability), recent-activity feed,
  and upcoming/overdue follow-ups you can tick off inline.
- **Organizations** — searchable table with add / edit / delete; detail pages
  list the organization's contacts and deals.
- **Contacts** — searchable table with a status filter (lead / qualified /
  customer); detail pages show deals and a full activity timeline.
- **Deals** — searchable table of every deal with stage, value, probability,
  expected value and close date; detail pages let you move deals between
  stages and log activity.
- **Pipeline** — the six stages (New → Qualified → Proposal → Negotiation →
  Won → Lost) as a board; drag a deal card between columns to change its
  stage. Column totals and expected revenue refresh automatically.

## How it's built

- **Vite + React + TypeScript** frontend (react-router, recharts, dnd-kit,
  lucide-react icons).
- **Express** API server with a **SQLite** database via Node's built-in
  `node:sqlite` (no native dependencies).
- **Vitest** unit tests covering CRUD for all four record types, search,
  stage changes (including Won and Lost), activities and task toggling.

## Project layout

```
server/    Express API + SQLite schema, seed data and data layer
shared/    TypeScript types shared by server and frontend
src/       React app (pages, components, styles)
tests/     Unit tests
data/      Local SQLite database (created at runtime, gitignored)
```