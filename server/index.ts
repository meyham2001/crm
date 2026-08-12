import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  closeDatabase, createActivity, createContact, createDeal, createOrganization, deleteActivity, deleteContact, deleteDeal,
  deleteOrganization, getBootstrap, getContact, getDeal, getOrganization, initDatabase, listActivities, listContacts,
  listDeals, listOrganizations, toggleActivity, updateActivity, updateContact, updateDeal, updateDealStage, updateOrganization,
  type Activity, type Contact, type Deal, type Organization, type Stage,
} from './db.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const db = initDatabase()
app.use(express.json())

const id = (value: string | string[]) => Number(Array.isArray(value) ? value[0] : value)
const sendResult = (res: express.Response, result: unknown) => result == null ? res.status(404).json({ error: 'Record not found' }) : res.json(result)
const handle = (handler: (req: express.Request, res: express.Response) => unknown) => (req: express.Request, res: express.Response) => {
  try { return handler(req, res) } catch (error) { console.error(error); return res.status(400).json({ error: error instanceof Error ? error.message : 'Request failed' }) }
}

app.get('/api/bootstrap', handle((_req, res) => res.json(getBootstrap(db))))

app.get('/api/organizations', handle((req, res) => res.json(listOrganizations(db, String(req.query.search || '')))))
app.get('/api/organizations/:id', handle((req, res) => sendResult(res, getOrganization(db, id(req.params.id)))))
app.post('/api/organizations', handle((req, res) => res.status(201).json(createOrganization(db, req.body as Omit<Organization, 'id' | 'createdAt' | 'contactCount' | 'dealCount'>))))
app.put('/api/organizations/:id', handle((req, res) => sendResult(res, updateOrganization(db, id(req.params.id), req.body))))
app.delete('/api/organizations/:id', handle((req, res) => res.json({ ok: deleteOrganization(db, id(req.params.id)) })))

app.get('/api/contacts', handle((req, res) => res.json(listContacts(db, String(req.query.search || ''), String(req.query.status || '')))))
app.get('/api/contacts/:id', handle((req, res) => sendResult(res, getContact(db, id(req.params.id)))))
app.post('/api/contacts', handle((req, res) => res.status(201).json(createContact(db, req.body as Omit<Contact, 'id' | 'createdAt' | 'organizationName'>))))
app.put('/api/contacts/:id', handle((req, res) => sendResult(res, updateContact(db, id(req.params.id), req.body))))
app.delete('/api/contacts/:id', handle((req, res) => res.json({ ok: deleteContact(db, id(req.params.id)) })))

app.get('/api/deals', handle((req, res) => res.json(listDeals(db, String(req.query.search || '')))))
app.get('/api/deals/:id', handle((req, res) => sendResult(res, getDeal(db, id(req.params.id)))))
app.post('/api/deals', handle((req, res) => res.status(201).json(createDeal(db, req.body as Omit<Deal, 'id' | 'createdAt' | 'organizationName' | 'contactName'>))))
app.put('/api/deals/:id', handle((req, res) => sendResult(res, updateDeal(db, id(req.params.id), req.body))))
app.patch('/api/deals/:id/stage', handle((req, res) => sendResult(res, updateDealStage(db, id(req.params.id), req.body.stage as Stage))))
app.delete('/api/deals/:id', handle((req, res) => res.json({ ok: deleteDeal(db, id(req.params.id)) })))

app.get('/api/activities', handle((req, res) => res.json(listActivities(db, { contactId: req.query.contactId ? id(String(req.query.contactId)) : undefined, dealId: req.query.dealId ? id(String(req.query.dealId)) : undefined }))))
app.post('/api/activities', handle((req, res) => res.status(201).json(createActivity(db, req.body as Omit<Activity, 'id' | 'contactName' | 'dealName'>))))
app.put('/api/activities/:id', handle((req, res) => sendResult(res, updateActivity(db, id(req.params.id), req.body))))
app.patch('/api/activities/:id/done', handle((req, res) => sendResult(res, toggleActivity(db, id(req.params.id), Boolean(req.body.done)))))
app.delete('/api/activities/:id', handle((req, res) => res.json({ ok: deleteActivity(db, id(req.params.id)) })))

if (process.env.NODE_ENV === 'production') {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const distDir = path.join(currentDir, '..', 'dist')
  app.use(express.static(distDir))
  app.get(/.*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

const server = app.listen(port, '0.0.0.0', () => console.log(`Personal CRM API running at http://localhost:${port}`))
const shutdown = () => { server.close(() => { closeDatabase(db); process.exit(0) }) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

export { app }
