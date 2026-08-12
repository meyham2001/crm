# Personal CRM

A private, local-first sales CRM for organizations, contacts, deals, pipeline movement, activities,
and follow-up tasks. It uses React and Vite for the UI, Express for the local API, and SQLite for
persistence. No account or network connection is needed once dependencies are installed.

## Start the app

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The first launch creates `data/crm.sqlite` and
seeds realistic sample data. The API runs on port 3001; both processes are started by the one
`npm run dev` command.

## Verify the project

```bash
npm test
npm run build
```

The database can be reset by stopping the app, removing `data/crm.sqlite`, and starting it again.
The app is designed for a single local user and stores all data on the machine.
