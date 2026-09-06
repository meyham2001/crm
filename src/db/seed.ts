import { db } from './database'
import { organizationRepository } from './organizationRepository'
import { contactRepository } from './contactRepository'
import { dealRepository } from './dealRepository'
import { activityRepository } from './activityRepository'
import type { Organization, Contact, Deal, Activity, ContactStatus, DealStage, ActivityType } from '../types'

const now = new Date()

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date: Date): string {
  return date.toISOString()
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const industries = [
  'Technology', 'Healthcare', 'Financial Services', 'Manufacturing', 'Retail',
  'Real Estate', 'Education', 'Professional Services', 'Media & Entertainment', 'Transportation'
]

const jobTitles = [
  'CEO', 'CTO', 'VP of Sales', 'VP of Marketing', 'Director of Operations',
  'Senior Manager', 'Account Executive', 'Sales Manager', 'Business Development', 'Procurement Lead'
]

const companyPrefixes = [
  'Apex', 'Meridian', 'Vertex', 'Nexus', 'Summit', 'Horizon', 'Catalyst', 'Pinnacle',
  'Vanguard', 'Sterling', 'Axiom', 'Quantum', 'Fusion', 'Nova', 'Prism', 'Zenith'
]

const companySuffixes = [
  'Systems', 'Solutions', 'Group', 'Partners', 'Technologies', 'Enterprises', 'Holdings',
  'International', 'Global', 'Inc', 'Corporation', 'Labs', 'Ventures', 'Capital', 'Industries'
]

const firstNames = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
]

function generateCompanyName(): string {
  return `${randomElement(companyPrefixes)} ${randomElement(companySuffixes)}`
}

function generatePersonName(): string {
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`
}

function generateEmail(name: string, company: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.')
  const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${cleanName}@${cleanCompany}.com`
}

function generatePhone(): string {
  return `+1-${randomInt(200, 999)}-${randomInt(200, 999)}-${randomInt(1000, 9999)}`
}

export function seedDatabase() {
  const orgCount = organizationRepository.count()
  if (orgCount > 0) {
    console.log('Database already seeded, skipping...')
    return
  }

  console.log('Seeding database with sample data...')

  const transaction = db.transaction(() => {
    const organizations: Organization[] = []

    for (let i = 0; i < 12; i++) {
      const name = generateCompanyName()
      const org = organizationRepository.create({
        name,
        website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
        industry: randomElement(industries),
        notes: `Key account in ${industries[randomInt(0, industries.length - 1)]}. ${randomInt(1, 5)} years relationship.`,
      })
      organizations.push(org)
    }

    const contacts: Contact[] = []
    const statuses: ContactStatus[] = ['lead', 'qualified', 'customer']

    for (let i = 0; i < 30; i++) {
      const org = randomElement(organizations)
      const name = generatePersonName()
      const contact = contactRepository.create({
        organization_id: org.id,
        name,
        email: generateEmail(name, org.name),
        phone: generatePhone(),
        job_title: randomElement(jobTitles),
        status: randomElement(statuses),
        notes: `Met at ${randomElement(['conference', 'referral', 'cold outreach', 'inbound', 'partner intro'])}. ${randomElement(['Very responsive', 'Needs nurturing', 'Decision maker', 'Influencer', 'Champion'])}.`,
      })
      contacts.push(contact)
    }

    const stages: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    const deals: Deal[] = []

    for (let i = 0; i < 25; i++) {
      const org = randomElement(organizations)
      const orgContacts = contacts.filter(c => c.organization_id === org.id)
      const contact = orgContacts.length > 0 ? randomElement(orgContacts) : null
      const stage = randomElement(stages)
      const value = randomInt(5000, 500000)
      const probability = stage === 'won' ? 100 : stage === 'lost' ? 0 : randomInt(10, 90)
      const closeDate = stage === 'won' || stage === 'lost'
        ? formatDate(addDays(now, randomInt(-60, 0)))
        : formatDate(addDays(now, randomInt(15, 180)))

      const deal = dealRepository.create({
        organization_id: org.id,
        contact_id: contact?.id || null,
        name: `${org.name} - ${randomElement(['Enterprise License', 'Annual Renewal', 'New Implementation', 'Expansion', 'Professional Services', 'Support Contract'])}`,
        stage,
        value,
        probability,
        close_date: closeDate,
        notes: `Deal initiated via ${randomElement(['inbound', 'outbound', 'referral', 'partner'])}. ${stage === 'won' ? 'Closed successfully.' : stage === 'lost' ? 'Lost to competitor.' : 'In progress.'}`,
      })
      deals.push(deal)
    }

    const activityTypes: ActivityType[] = ['note', 'call', 'email']
    const activities: Activity[] = []

    for (let i = 0; i < 60; i++) {
      const contact = randomElement(contacts)
      const deal = randomElement([...deals, null, null, null])
      const type = randomElement(activityTypes)
      const occurredAt = formatDate(addDays(now, randomInt(-30, 0)))
      const hasDueDate = Math.random() < 0.3
      const dueDate = hasDueDate ? formatDate(addDays(now, randomInt(-10, 30))) : null
      const done = dueDate ? Math.random() < 0.5 : true

      const descriptions: Record<ActivityType, string[]> = {
        note: [
          'Discussed Q4 roadmap and budget allocation',
          'Shared product documentation and pricing',
          'Followed up on technical requirements',
          'Sent case studies and references',
          'Noted decision criteria and timeline',
        ],
        call: [
          'Discovery call - identified pain points',
          'Demo follow-up call',
          'Negotiation call - pricing discussion',
          'Quarterly business review',
          'Stakeholder alignment call',
        ],
        email: [
          'Sent proposal and contract',
          'Follow-up on outstanding questions',
          'Shared implementation timeline',
          'Requested introduction to decision maker',
          'Sent renewal reminder',
        ],
      }

      const activity = activityRepository.create({
        contact_id: contact.id,
        deal_id: deal?.id || null,
        type,
        description: randomElement(descriptions[type]),
        occurred_at: occurredAt,
        due_date: dueDate,
        done,
      })
      activities.push(activity)
    }

    console.log(`Created ${organizations.length} organizations`)
    console.log(`Created ${contacts.length} contacts`)
    console.log(`Created ${deals.length} deals`)
    console.log(`Created ${activities.length} activities`)
  })

  transaction()
  console.log('Database seeded successfully!')
}