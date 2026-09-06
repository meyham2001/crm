import express from 'express'

initializeDatabase()

import { organizationRepository } from '../src/db/organizationRepository'
import { contactRepository } from '../src/db/contactRepository'
import { dealRepository } from '../src/db/dealRepository'
import { activityRepository } from '../src/db/activityRepository'
import { dashboardRepository } from '../src/db/dashboardRepository'
import type { Organization, Contact, Deal, Activity, DealStage, ContactStatus, ActivityType } from '../src/types'

import { initializeDatabase } from '../src/db/database'

function initializeDatabase() {
  // This will be replaced by the actual import
}

const app = express()
app.use(express.json())

const PORT = 4901

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Organizations
app.get('/api/organizations', (req, res) => {
  const { q } = req.query
  if (q) {
    res.json(organizationRepository.search(q as string))
  } else {
    res.json(organizationRepository.findAll())
  }
})

app.get('/api/organizations/:id', (req, res) => {
  const org = organizationRepository.findById(req.params.id)
  if (!org) return res.status(404).json({ error: 'Not found' })
  res.json(org)
})

app.post('/api/organizations', (req, res) => {
  const org = organizationRepository.create(req.body)
  res.status(201).json(org)
})

app.put('/api/organizations/:id', (req, res) => {
  const org = organizationRepository.update(req.params.id, req.body)
  if (!org) return res.status(404).json({ error: 'Not found' })
  res.json(org)
})

app.delete('/api/organizations/:id', (req, res) => {
  const deleted = organizationRepository.delete(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

// Contacts
app.get('/api/contacts', (req, res) => {
  const { q, status } = req.query
  if (q) {
    res.json(contactRepository.search(q as string, status as ContactStatus | undefined))
  } else if (status) {
    res.json(contactRepository.findByStatus(status as ContactStatus))
  } else {
    res.json(contactRepository.findAll())
  }
})

app.get('/api/contacts/:id', (req, res) => {
  const contact = contactRepository.findById(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  res.json(contact)
})

app.post('/api/contacts', (req, res) => {
  const contact = contactRepository.create(req.body)
  res.status(201).json(contact)
})

app.put('/api/contacts/:id', (req, res) => {
  const contact = contactRepository.update(req.params.id, req.body)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  res.json(contact)
})

app.delete('/api/contacts/:id', (req, res) => {
  const deleted = contactRepository.delete(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

// Deals
app.get('/api/deals', (req, res) => {
  const { q, stage } = req.query
  if (q) {
    res.json(dealRepository.search(q as string))
  } else if (stage) {
    res.json(dealRepository.findByStage(stage as DealStage))
  } else {
    res.json(dealRepository.findAll())
  }
})

app.get('/api/deals/:id', (req, res) => {
  const deal = dealRepository.findById(req.params.id)
  if (!deal) return res.status(404).json({ error: 'Not found' })
  res.json(deal)
})

app.post('/api/deals', (req, res) => {
  const deal = dealRepository.create(req.body)
  res.status(201).json(deal)
})

app.put('/api/deals/:id', (req, res) => {
  const deal = dealRepository.update(req.params.id, req.body)
  if (!deal) return res.status(404).json({ error: 'Not found' })
  res.json(deal)
})

app.delete('/api/deals/:id', (req, res) => {
  const deleted = dealRepository.delete(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

app.put('/api/deals/:id/stage', (req, res) => {
  const { stage } = req.body
  const deal = dealRepository.updateStage(req.params.id, stage)
  if (!deal) return res.status(404).json({ error: 'Not found' })
  res.json(deal)
})

// Activities
app.get('/api/activities', (req, res) => {
  const { contact_id, deal_id } = req.query
  if (contact_id) {
    res.json(activityRepository.findByContact(contact_id as string))
  } else if (deal_id) {
    res.json(activityRepository.findByDeal(deal_id as string))
  } else {
    res.json(activityRepository.findAll())
  }
})

app.get('/api/activities/:id', (req, res) => {
  const activity = activityRepository.findById(req.params.id)
  if (!activity) return res.status(404).json({ error: 'Not found' })
  res.json(activity)
})

app.post('/api/activities', (req, res) => {
  const activity = activityRepository.create(req.body)
  res.status(201).json(activity)
})

app.put('/api/activities/:id', (req, res) => {
  const activity = activityRepository.update(req.params.id, req.body)
  if (!activity) return res.status(404).json({ error: 'Not found' })
  res.json(activity)
})

app.put('/api/activities/:id/done', (req, res) => {
  const activity = activityRepository.toggleDone(req.params.id)
  if (!activity) return res.status(404).json({ error: 'Not found' })
  res.json(activity)
})

app.delete('/api/activities/:id', (req, res) => {
  const deleted = activityRepository.delete(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

// Dashboard
app.get('/api/dashboard', (req, res) => {
  res.json({
    dealsWonPerMonth: dashboardRepository.getDealsWonPerMonth(),
    revenueWonPerMonth: dashboardRepository.getRevenueWonPerMonth(),
    pipelineStats: dashboardRepository.getPipelineStats(),
    recentActivities: dashboardRepository.getRecentActivities(),
    upcomingTasks: dashboardRepository.getUpcomingTasks(),
    overdueTasks: dashboardRepository.getOverdueTasks(),
    totalDeals: dealRepository.count(),
    totalOrgs: organizationRepository.count(),
    totalContacts: contactRepository.count(),
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://localhost:${PORT}`)
})