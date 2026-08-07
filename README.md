# Personal CRM

A local-first sales CRM that runs entirely on your machine: organizations, contacts, deals,
a drag-and-drop pipeline, activities & follow-up tasks, and a dashboard — pre-loaded with
realistic sample data. Built with Vite + React + TypeScript, Express and SQLite.

## Running the app

Requires Node.js (tested with Node 24).

1. Install dependencies (first time only):

   ```
   npm install
   ```

2. Start the app with one command:

   ```
   npm start
   ```

3. Open **http://localhost:3000** in your browser.

On first launch the app creates a local SQLite database (`data/crm.db`) and fills it with
realistic sample data. Your changes persist there across restarts.

Useful extras:

- `npm run seed:reset` — wipe the database and restore the original sample data.
- `npm run dev` — development mode with hot reload (API on :3000, frontend on :5173).
- `npm test` — run the unit test suite.
- `PORT=4000 npm start` — run on a different port.

## For building the project with a coding agent

1. Install your favourite coding agent (Claude Code, Codex, Cursor, OpenCode, …).
2. Start it in this directory and enter:
   `Build the entire project; only stop when success criteria are met and the product is running`

## For building with Pi and Open-Source models

Open a terminal and run:
`git checkout pi`

This README should be updated automatically; follow the new instructions
