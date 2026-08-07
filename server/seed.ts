import type { DB } from "./db";
import {
  createOrganization,
  createContact,
  createDeal,
  createActivity
} from "./repo";

const DAY = 86_400_000;
const HOUR = 3_600_000;

const iso = (d: Date) => d.toISOString();
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR);

/** A date `m` months back, on the given day (clamped so it never lands in the future). */
function monthsAgo(m: number, day: number): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - m, Math.min(day, m === 0 ? now.getDate() : 28), 12);
  return d;
}

/** Fill the database with realistic sample data. */
export function seed(db: DB): void {
  const tx = db.transaction(() => {
    /* ---------------- Organizations ---------------- */
    const northwind = createOrganization(db, {
      name: "Northwind Logistics",
      website: "northwindlogistics.com",
      industry: "Transportation & Logistics",
      notes: "National freight and warehousing operator. Expanding their fleet technology stack; strong relationship with the operations team."
    });
    const acme = createOrganization(db, {
      name: "Acme Manufacturing",
      website: "acmemanufacturing.com",
      industry: "Manufacturing",
      notes: "Mid-size manufacturer with three plants. Modernising plant-floor systems over the next two years."
    });
    const bluepeak = createOrganization(db, {
      name: "Bluepeak Software",
      website: "bluepeak.io",
      industry: "Software & Technology",
      notes: "Fast-growing SaaS company. Already a customer for cloud migration; good candidate for platform services."
    });
    const harborlane = createOrganization(db, {
      name: "Harbor & Lane Retail",
      website: "harborlane.com",
      industry: "Retail",
      notes: "Regional retail chain, 40+ stores. Investing in inventory intelligence and store analytics."
    });
    const summit = createOrganization(db, {
      name: "Summit Health Group",
      website: "summithealth.org",
      industry: "Healthcare",
      notes: "Network of clinics. Careful procurement process; values compliance and reliability."
    });
    const vertex = createOrganization(db, {
      name: "Vertex Financial",
      website: "vertexfinancial.com",
      industry: "Financial Services",
      notes: "Insurance and wealth management firm. Long-standing customer; CFO is a strong advocate."
    });
    const greenfield = createOrganization(db, {
      name: "Greenfield Energy",
      website: "greenfieldenergy.com",
      industry: "Energy & Utilities",
      notes: "Renewables operator exploring remote monitoring for distributed assets."
    });
    const orchard = createOrganization(db, {
      name: "Orchard Media",
      website: "orchardmedia.co",
      industry: "Media & Entertainment",
      notes: "Digital publisher. Budget-conscious but keen on audience analytics."
    });

    /* ---------------- Contacts ---------------- */
    const maria = createContact(db, {
      name: "Maria Chen",
      email: "maria.chen@northwindlogistics.com",
      phone: "(312) 555-0148",
      title: "VP of Operations",
      organization_id: northwind.id,
      status: "customer"
    });
    const james = createContact(db, {
      name: "James Okafor",
      email: "j.okafor@northwindlogistics.com",
      phone: "(312) 555-0192",
      title: "Procurement Manager",
      organization_id: northwind.id,
      status: "qualified"
    });
    const sarah = createContact(db, {
      name: "Sarah Whitfield",
      email: "sarah.whitfield@acmemanufacturing.com",
      phone: "(216) 555-0135",
      title: "Chief Operating Officer",
      organization_id: acme.id,
      status: "customer"
    });
    const dan = createContact(db, {
      name: "Dan Kowalski",
      email: "dan.kowalski@acmemanufacturing.com",
      phone: "(216) 555-0177",
      title: "Plant Director",
      organization_id: acme.id,
      status: "qualified"
    });
    const priya = createContact(db, {
      name: "Priya Natarajan",
      email: "priya@bluepeak.io",
      phone: "(512) 555-0119",
      title: "Chief Technology Officer",
      organization_id: bluepeak.id,
      status: "customer"
    });
    const tom = createContact(db, {
      name: "Tom Alvarez",
      email: "tom.alvarez@bluepeak.io",
      phone: "(512) 555-0163",
      title: "Head of IT",
      organization_id: bluepeak.id,
      status: "lead"
    });
    const elena = createContact(db, {
      name: "Elena Petrova",
      email: "elena.petrova@harborlane.com",
      phone: "(206) 555-0182",
      title: "Director of Retail Operations",
      organization_id: harborlane.id,
      status: "lead"
    });
    const marcus = createContact(db, {
      name: "Marcus Lee",
      email: "marcus.lee@harborlane.com",
      phone: "(206) 555-0126",
      title: "E-commerce Manager",
      organization_id: harborlane.id,
      status: "lead"
    });
    const alan = createContact(db, {
      name: "Alan Reyes",
      email: "alan.reyes@summithealth.org",
      phone: "(720) 555-0154",
      title: "Chief Information Officer",
      organization_id: summit.id,
      status: "qualified"
    });
    const grace = createContact(db, {
      name: "Grace Kim",
      email: "grace.kim@summithealth.org",
      phone: "(720) 555-0111",
      title: "Practice Administrator",
      organization_id: summit.id,
      status: "lead"
    });
    const robert = createContact(db, {
      name: "Robert Hayes",
      email: "robert.hayes@vertexfinancial.com",
      phone: "(617) 555-0170",
      title: "Chief Financial Officer",
      organization_id: vertex.id,
      status: "customer"
    });
    const naomi = createContact(db, {
      name: "Naomi Sutton",
      email: "naomi.sutton@vertexfinancial.com",
      phone: "(617) 555-0139",
      title: "VP of Technology",
      organization_id: vertex.id,
      status: "qualified"
    });
    const carlos = createContact(db, {
      name: "Carlos Mendes",
      email: "carlos.mendes@greenfieldenergy.com",
      phone: "(480) 555-0122",
      title: "Operations Director",
      organization_id: greenfield.id,
      status: "lead"
    });
    const sofia = createContact(db, {
      name: "Sofia Marchetti",
      email: "sofia.marchetti@orchardmedia.co",
      phone: "(646) 555-0195",
      title: "Head of Digital",
      organization_id: orchard.id,
      status: "qualified"
    });

    /* ---------------- Deals ---------------- */
    // Won — spread across the last six months so the dashboard charts look alive.
    createDeal(db, {
      name: "POS analytics add-on",
      organization_id: harborlane.id,
      contact_id: marcus.id,
      stage: "won",
      value: 18500,
      close_date: dateOnly(daysAgo(2))
    });
    createDeal(db, {
      name: "Fleet tracking rollout",
      organization_id: northwind.id,
      contact_id: maria.id,
      stage: "won",
      value: 86000,
      close_date: dateOnly(monthsAgo(1, 14))
    });
    createDeal(db, {
      name: "Warehouse automation suite",
      organization_id: acme.id,
      contact_id: sarah.id,
      stage: "won",
      value: 124500,
      close_date: dateOnly(monthsAgo(2, 9))
    });
    createDeal(db, {
      name: "Cloud migration — phase 1",
      organization_id: bluepeak.id,
      contact_id: priya.id,
      stage: "won",
      value: 58000,
      close_date: dateOnly(monthsAgo(3, 21))
    });
    createDeal(db, {
      name: "Support renewal — annual",
      organization_id: summit.id,
      contact_id: alan.id,
      stage: "won",
      value: 42000,
      close_date: dateOnly(monthsAgo(4, 6))
    });
    createDeal(db, {
      name: "Risk analytics platform",
      organization_id: vertex.id,
      contact_id: robert.id,
      stage: "won",
      value: 97500,
      close_date: dateOnly(monthsAgo(5, 17))
    });
    // Lost
    createDeal(db, {
      name: "Legacy ERP replacement",
      organization_id: acme.id,
      contact_id: dan.id,
      stage: "lost",
      value: 210000,
      close_date: dateOnly(daysAgo(24))
    });
    createDeal(db, {
      name: "Ad sales dashboard",
      organization_id: orchard.id,
      contact_id: sofia.id,
      stage: "lost",
      value: 33000,
      close_date: dateOnly(daysAgo(47))
    });
    // Negotiation
    const logisticsContract = createDeal(db, {
      name: "National logistics contract",
      organization_id: northwind.id,
      contact_id: maria.id,
      stage: "negotiation",
      value: 150000,
      probability: 70,
      close_date: dateOnly(daysAhead(21))
    });
    const claimsUpgrade = createDeal(db, {
      name: "Claims processing upgrade",
      organization_id: vertex.id,
      contact_id: naomi.id,
      stage: "negotiation",
      value: 88000,
      probability: 60,
      close_date: dateOnly(daysAhead(30))
    });
    // Proposal
    const telehealth = createDeal(db, {
      name: "Telehealth integration",
      organization_id: summit.id,
      contact_id: alan.id,
      stage: "proposal",
      value: 76000,
      probability: 50,
      close_date: dateOnly(daysAhead(45))
    });
    const inventoryForecast = createDeal(db, {
      name: "Retail inventory forecasting",
      organization_id: harborlane.id,
      contact_id: elena.id,
      stage: "proposal",
      value: 64000,
      probability: 45,
      close_date: dateOnly(daysAhead(38))
    });
    const gridPilot = createDeal(db, {
      name: "Grid monitoring pilot",
      organization_id: greenfield.id,
      contact_id: carlos.id,
      stage: "proposal",
      value: 39000,
      probability: 40,
      close_date: dateOnly(daysAhead(52))
    });
    // Qualified
    const sensors = createDeal(db, {
      name: "Plant floor sensor network",
      organization_id: acme.id,
      contact_id: dan.id,
      stage: "qualified",
      value: 52000,
      probability: 25,
      close_date: dateOnly(daysAhead(65))
    });
    const contentDelivery = createDeal(db, {
      name: "Content delivery revamp",
      organization_id: orchard.id,
      contact_id: sofia.id,
      stage: "qualified",
      value: 47500,
      probability: 30,
      close_date: dateOnly(daysAhead(58))
    });
    // New
    const dataPlatform = createDeal(db, {
      name: "Data platform assessment",
      organization_id: bluepeak.id,
      contact_id: tom.id,
      stage: "new",
      value: 25000,
      probability: 10,
      close_date: dateOnly(daysAhead(75))
    });
    const fleetMaintenance = createDeal(db, {
      name: "Fleet maintenance module",
      organization_id: northwind.id,
      contact_id: james.id,
      stage: "new",
      value: 31000,
      probability: 15,
      close_date: dateOnly(daysAhead(80))
    });

    /* ---------------- Activities ---------------- */
    // Today / very recent — keeps the feed fresh.
    createActivity(db, {
      type: "call",
      contact_id: maria.id,
      deal_id: logisticsContract.id,
      description: "Walked Maria through the revised pricing tiers. She wants the final contract language by end of week.",
      occurred_at: iso(hoursAgo(2))
    });
    createActivity(db, {
      type: "email",
      contact_id: elena.id,
      deal_id: inventoryForecast.id,
      description: "Sent Elena the ROI worksheet for inventory forecasting, with Harbor & Lane's store counts plugged in.",
      occurred_at: iso(hoursAgo(5))
    });
    createActivity(db, {
      type: "note",
      contact_id: naomi.id,
      deal_id: claimsUpgrade.id,
      description: "Naomi confirmed the security review passed. Legal is the last gate before signature.",
      occurred_at: iso(hoursAgo(26))
    });
    // Past activities across records.
    createActivity(db, {
      type: "call",
      contact_id: dan.id,
      deal_id: sensors.id,
      description: "Site walkthrough with Dan. Two plants are ready for sensors; the third needs network upgrades first.",
      occurred_at: iso(daysAgo(3))
    });
    createActivity(db, {
      type: "email",
      contact_id: robert.id,
      description: "Robert introduced me to Naomi, who will own the claims processing upgrade day-to-day.",
      occurred_at: iso(daysAgo(4))
    });
    createActivity(db, {
      type: "note",
      contact_id: carlos.id,
      deal_id: gridPilot.id,
      description: "Carlos wants the pilot scoped to 12 substations. Drafting a one-page pilot plan.",
      occurred_at: iso(daysAgo(6))
    });
    createActivity(db, {
      type: "call",
      contact_id: sofia.id,
      deal_id: contentDelivery.id,
      description: "Discovery call: Orchard's CDN costs spiked 40% after the video relaunch. Strong pain point.",
      occurred_at: iso(daysAgo(8))
    });
    createActivity(db, {
      type: "email",
      contact_id: alan.id,
      deal_id: telehealth.id,
      description: "Sent Summit's team the telehealth integration architecture overview and compliance notes.",
      occurred_at: iso(daysAgo(9))
    });
    createActivity(db, {
      type: "note",
      contact_id: tom.id,
      deal_id: dataPlatform.id,
      description: "Tom downloaded our data platform whitepaper and asked about migration timelines.",
      occurred_at: iso(daysAgo(11))
    });
    createActivity(db, {
      type: "call",
      contact_id: grace.id,
      description: "Cold call — Grace was receptive. Summit is reviewing practice management tools next quarter.",
      occurred_at: iso(daysAgo(13))
    });
    createActivity(db, {
      type: "note",
      contact_id: james.id,
      deal_id: fleetMaintenance.id,
      description: "James flagged that procurement requires two vendor references from logistics companies.",
      occurred_at: iso(daysAgo(15))
    });
    createActivity(db, {
      type: "email",
      contact_id: marcus.id,
      description: "Marcus confirmed the POS analytics add-on went live in 12 stores. Asking for a 30-day check-in.",
      occurred_at: iso(daysAgo(1))
    });
    createActivity(db, {
      type: "note",
      contact_id: sarah.id,
      description: "Quarterly business review went well. Sarah hinted at a second warehouse in 2027.",
      occurred_at: iso(daysAgo(19))
    });
    createActivity(db, {
      type: "call",
      contact_id: priya.id,
      description: "Priya confirmed cloud migration phase 1 closed cleanly; phase 2 scoping starts next quarter.",
      occurred_at: iso(daysAgo(23))
    });
    // Tasks: overdue (not done).
    createActivity(db, {
      type: "email",
      contact_id: elena.id,
      deal_id: inventoryForecast.id,
      description: "Send Elena the revised proposal with the phased rollout option.",
      occurred_at: iso(daysAgo(4)),
      due_date: dateOnly(daysAgo(2)),
      done: false
    });
    createActivity(db, {
      type: "call",
      contact_id: dan.id,
      deal_id: sensors.id,
      description: "Follow up with Dan on sensor pricing for the second plant.",
      occurred_at: iso(daysAgo(7)),
      due_date: dateOnly(daysAgo(5)),
      done: false
    });
    // Tasks: upcoming.
    createActivity(db, {
      type: "note",
      contact_id: maria.id,
      deal_id: logisticsContract.id,
      description: "Contract redline review with Northwind legal.",
      occurred_at: iso(daysAgo(2)),
      due_date: dateOnly(daysAhead(1)),
      done: false
    });
    createActivity(db, {
      type: "call",
      contact_id: naomi.id,
      deal_id: claimsUpgrade.id,
      description: "Demo the claims module for Naomi's team (45 min).",
      occurred_at: iso(daysAgo(1)),
      due_date: dateOnly(daysAhead(3)),
      done: false
    });
    createActivity(db, {
      type: "call",
      contact_id: carlos.id,
      description: "Intro call with Carlos to walk through the pilot plan.",
      occurred_at: iso(daysAgo(3)),
      due_date: dateOnly(daysAhead(6)),
      done: false
    });
    createActivity(db, {
      type: "email",
      contact_id: alan.id,
      description: "Prepare renewal kickoff agenda for Summit's annual support.",
      occurred_at: iso(daysAgo(2)),
      due_date: dateOnly(daysAhead(9)),
      done: false
    });
    // Tasks: completed.
    createActivity(db, {
      type: "email",
      contact_id: robert.id,
      description: "Send Vertex the two case studies they asked for.",
      occurred_at: iso(daysAgo(12)),
      due_date: dateOnly(daysAgo(10)),
      done: true
    });
    createActivity(db, {
      type: "note",
      contact_id: tom.id,
      deal_id: dataPlatform.id,
      description: "Run scoping workshop with Bluepeak's platform team.",
      occurred_at: iso(daysAgo(16)),
      due_date: dateOnly(daysAgo(14)),
      done: true
    });
  });
  tx();
}

/** Seed the database only if it contains no organizations yet. */
export function seedIfEmpty(db: DB): boolean {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM organizations").get() as { n: number };
  if (n > 0) return false;
  seed(db);
  return true;
}
