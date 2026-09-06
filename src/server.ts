import express, { type Request, type Response } from 'express'
import cors from 'cors'
import path from 'path'
import { initializeDatabase } from './db/database'
import { seedDatabase } from './db/seed'
import { organizationRepository } from './db/organizationRepository'
import { contactRepository } from './db/contactRepository'
import { dealRepository } from './db/dealRepository'
import { activityRepository } from './db/activityRepository'
import { dashboardRepository } from './db/dashboardRepository'
import type { ContactStatus, DealStage } from './types'

// Initialize SQLite schema and seed data
initializeDatabase()
seedDatabase()

const app = express()
const PORT = process.env.PORT || 4901

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files from build directory
app.use(express.static(path.join(process.cwd(), 'dist')))

// API Routes for Organizations
app.get('/api/organizations', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string | undefined
    if (query) {
      const organizations = organizationRepository.search(query)
      return res.json(organizations)
    }
    const organizations = organizationRepository.findAll()
    res.json(organizations)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch organizations' })
  }
})

app.get('/api/organizations/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const organization = organizationRepository.findById(id)
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' })
    }
    res.json(organization)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch organization' })
  }
})

app.post('/api/organizations', (req: Request, res: Response) => {
  try {
    const organization = organizationRepository.create(req.body)
    res.status(201).json(organization)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create organization' })
  }
})

app.put('/api/organizations/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const updated = organizationRepository.update(id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Organization not found' })
    }
    res.json(updated)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update organization' })
  }
})

app.delete('/api/organizations/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const deleted = organizationRepository.delete(id)
    if (!deleted) {
      return res.status(404).json({ error: 'Organization not found' })
    }
    res.json({ message: 'Organization deleted successfully' })
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete organization' })
  }
})

// API Routes for Contacts
app.get('/api/contacts', (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined
    const status = req.query.status as ContactStatus | undefined
    if (q || status) {
      const contacts = contactRepository.search(q || '', status)
      return res.json(contacts)
    }
    const contacts = contactRepository.findAll()
    res.json(contacts)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})

app.get('/api/contacts/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const contact = contactRepository.findById(id)
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }
    res.json(contact)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch contact' })
  }
})

app.post('/api/contacts', (req: Request, res: Response) => {
  try {
    const contact = contactRepository.create(req.body)
    res.status(201).json(contact)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create contact' })
  }
})

app.put('/api/contacts/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const updated = contactRepository.update(id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Contact not found' })
    }
    res.json(updated)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update contact' })
  }
})

app.delete('/api/contacts/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const deleted = contactRepository.delete(id)
    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' })
    }
    res.json({ message: 'Contact deleted successfully' })
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete contact' })
  }
})

// API Routes for Deals
app.get('/api/deals', (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined
    const stage = req.query.stage as DealStage | undefined
    if (q) {
      let deals = dealRepository.search(q)
      if (stage) {
        deals = deals.filter(d => d.stage === stage)
      }
      return res.json(deals)
    }
    if (stage) {
      const deals = dealRepository.findByStage(stage)
      return res.json(deals)
    }
    const deals = dealRepository.findAll()
    res.json(deals)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch deals' })
  }
})

app.get('/api/deals/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const deal = dealRepository.findById(id)
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' })
    }
    res.json(deal)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch deal' })
  }
})

app.post('/api/deals', (req: Request, res: Response) => {
  try {
    const deal = dealRepository.create(req.body)
    res.status(201).json(deal)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create deal' })
  }
})

app.put('/api/deals/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const updated = dealRepository.update(id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Deal not found' })
    }
    res.json(updated)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update deal' })
  }
})

app.put('/api/deals/:id/stage', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const stage = req.body.stage as DealStage
    if (!stage) {
      return res.status(400).json({ error: 'Stage is required' })
    }
    const updated = dealRepository.updateStage(id, stage)
    if (!updated) {
      return res.status(404).json({ error: 'Deal not found' })
    }
    res.json(updated)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update deal stage' })
  }
})

app.delete('/api/deals/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const deleted = dealRepository.delete(id)
    if (!deleted) {
      return res.status(404).json({ error: 'Deal not found' })
    }
    res.json({ message: 'Deal deleted successfully' })
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete deal' })
  }
})

// API Routes for Activities
app.get('/api/activities', (req: Request, res: Response) => {
  try {
    const contact_id = req.query.contact_id as string | undefined
    const deal_id = req.query.deal_id as string | undefined
    if (contact_id) {
      const activities = activityRepository.findByContact(contact_id)
      return res.json(activities)
    }
    if (deal_id) {
      const activities = activityRepository.findByDeal(deal_id)
      return res.json(activities)
    }
    const activities = activityRepository.findAll()
    res.json(activities)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch activities' })
  }
})

app.get('/api/activities/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const activity = activityRepository.findById(id)
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' })
    }
    res.json(activity)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

app.post('/api/activities', (req: Request, res: Response) => {
  try {
    const activity = activityRepository.create(req.body)
    res.status(201).json(activity)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create activity' })
  }
})

app.put('/api/activities/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const updated = activityRepository.update(id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Activity not found' })
    }
    res.json(updated)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update activity' })
  }
})

app.put('/api/activities/:id/done', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const updated = activityRepository.toggleDone(id)
    if (!updated) {
      return res.status(404).json({ error: 'Activity not found' })
    }
    res.json(updated)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update activity status' })
  }
})

app.delete('/api/activities/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const deleted = activityRepository.delete(id)
    if (!deleted) {
      return res.status(404).json({ error: 'Activity not found' })
    }
    res.json({ message: 'Activity deleted successfully' })
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete activity' })
  }
})

// Dashboard endpoint
app.get('/api/dashboard', (_req: Request, res: Response) => {
  try {
    const dashboardData = {
      dealsWonPerMonth: dashboardRepository.getDealsWonPerMonth(),
      revenueWonPerMonth: dashboardRepository.getRevenueWonPerMonth(),
      pipelineStats: dashboardRepository.getPipelineStats(),
      recentActivities: dashboardRepository.getRecentActivities(),
      upcomingTasks: dashboardRepository.getUpcomingTasks(),
      overdueTasks: dashboardRepository.getOverdueTasks(),
      totalDeals: dealRepository.findAll().length,
      totalOrgs: organizationRepository.findAll().length,
      totalContacts: contactRepository.findAll().length,
    }
    res.json(dashboardData)
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

// Serve React app for all other routes
app.get('{*splat}', (_req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'dist/index.html'))
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default app