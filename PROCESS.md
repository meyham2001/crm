# CRM System Build Process

You should follow this process to build the entire project:

1. Read everything first: REQUIREMENTS.md (success criteria are the contract), SELF_IMPROVE.md,
   README.md, .devcontainer/ (ports, installed tools), and any skills available to you.
2. Build the entire project as documented in REQUIREMENTS.md, phase by phase.
3. Ensure all success criteria are met — demonstrated, not asserted.
4. Use your product_review subagent to check the final product.
5. Incorporate the review feedback (fix real issues; consciously skip out-of-scope nice-to-haves).
6. IMPORTANT: follow the instructions in SELF_IMPROVE.md to improve yourself.

You must complete step 6 (self-improvement) before you stop.

---

## Playbook (learnings from previous runs — keep and refine these)

### Environment & tooling gotchas

- **Native npm modules**: npm ≥11 blocks postinstall scripts by default. After `npm install`,
  check the output for `npm warn allow-scripts`; if better-sqlite3/esbuild were blocked, run
  `npm approve-scripts <pkg…>` and `npm install` again before debugging phantom failures.
- **Starting the server from the bash tool**: always fully detach, or the tool hangs waiting on
  the background job's stdout: `setsid nohup npm run serve > server.log 2>&1 < /dev/null &`.
  Never put a foreground verification command *inside* a backgrounded `&&` chain.
  IMPORTANT: background servers started by the agent do NOT survive across session turns —
  if the user reports a blank/hanging page on the host, first check `ss -tln | grep <port>`;
  the forwarded port may simply have no live listener. The durable answer for the user is the
  documented foreground `npm start` in their own terminal. Verify host-reachability from inside
  by curling the container's external IP (`hostname -I`), not just 127.0.0.1.
- **Killing the server**: `pkill -f "<pattern>"` matches your own shell's command line and kills
  it (mysterious "hangs"). Use the bracket trick: `pkill -f "server/index[.]ts"`.
- **File artifacts stay in the workspace**: permission rules deny writes/reads outside it
  (e.g. /tmp). Save screenshots and logs inside the repo (a gitignored `.shots/` dir works well).
- **Server must bind 0.0.0.0** so the dev-container port is reachable from the host.

### Architecture recipe that worked

- Express + better-sqlite3 REST API (`server/`) with a pure repository layer (`server/repo.ts`);
  Vite + React + TS SPA (`src/`) served from `dist/` by the same server → one command (`npm start`),
  SPA fallback for deep links, `/api` proxy in dev.
- Tests: vitest + supertest against the repo layer and the HTTP API, using `:memory:` databases.
  Test CRUD for every record type, search (incl. LIKE-escaping), filters, stage transitions with
  side effects, and dashboard aggregates.
- Seed with **relative dates** (daysAgo/monthsAgo helpers) so charts, "won this month", overdue
  tasks and relative timestamps always look alive. Make the seed respect explicit `occurred_at`
  values — a seed that silently ignores them makes every activity "just now" (a real bug once).
- Popular libs, no hand-rolling: @tanstack/react-table (sortable tables), recharts (charts),
  @dnd-kit/core (pipeline drag-and-drop), react-router-dom, lucide-react icons.
- Server-side stage side effects keep data coherent: Won → probability 100 + close_date stamped;
  Lost → probability 0.

### Verification loop (unit tests are necessary, NOT sufficient)

- After each phase, drive the real app with the agent-browser skill: snapshot → click/fill →
  screenshot → inspect the screenshot yourself (don't trust "it rendered").
- **agent-browser quirks**: `fill <sel> ""` does NOT trigger React onChange on controlled inputs —
  clear with click + `press Control+a` + `press Backspace` before blaming the app. `drag @card @column`
  works with dnd-kit PointerSensor (distance ~6). Save screenshots with absolute workspace paths.
- Check on every page: `agent-browser errors` and `agent-browser console` must be empty.
- Check layouts numerically, not just visually: e.g. pipeline board
  `scrollWidth === clientWidth` at a 1600px viewport (scrollbars only when truly needed).
- Verify persistence by reloading after mutations; verify cross-view consistency
  (pipeline drag matches the Deals table and the API).
- Before finishing, reset to pristine seed data (`npm run seed:reset` + restart) so first launch
  looks perfect, and make sure README documents the single start command and URL.

### Review & feedback

- Give the product_review subagent a concrete checklist (the success criteria) plus explicit
  instructions to create/edit/delete/drag/toggle and to report issues with severities.
- Incorporate feedback by default; skip only what REQUIREMENTS.md declares out of scope
  (e.g. pagination) — and note why you skipped it.
