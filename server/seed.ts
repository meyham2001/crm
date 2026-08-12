import type { DatabaseSync } from "node:sqlite";

export function daysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 19);
}

export function monthsFromNow(monthsAgoCount: number, monthDay: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgoCount, monthDay, 10, 0, 0);
  return d.toISOString().slice(0, 19);
}

export function hoursAgo(hours: number): string {
  const d = new Date(Date.now() - hours * 3600_000);
  return d.toISOString().slice(0, 19);
}

const orgs = [
  { name: "Northwind Trading Co", website: "northwindtrading.com", industry: "Wholesale distribution", notes: "Long-standing distributor of industrial goods across the Midwest. Purchasing decisions made by the operations team." },
  { name: "Brightline Media", website: "brightline.media", industry: "Media & advertising", notes: "Fast-growing digital agency. Interested in volume licensing for campaign management." },
  { name: "Atlas Logistics", website: "atlaslogistics.com", industry: "Logistics", notes: "Nationwide freight carrier with a large field sales organization." },
  { name: "Fenwick Robotics", website: "fenwickrobotics.io", industry: "Robotics", notes: "Series B startup building warehouse automation. Budget comes out of the 2025 procurement cycle." },
  { name: "Harbor & Vine", website: "harborandvine.com", industry: "Hospitality", notes: "Boutique hotel and restaurant group with 14 locations." },
  { name: "Kestrel Analytics", website: "kestrelanalytics.com", industry: "SaaS / data", notes: "Data platform vendor. Natural partner for co-selling." },
  { name: "Meridian Health", website: "meridianhealth.org", industry: "Healthcare", notes: "Regional health network, 5 hospitals. Procurement requires security review." },
  { name: "Solstice Energy", website: "solstice.energy", industry: "Energy", notes: "Solar installer scaling quickly; needs predictable quoting workflows." },
];

const contacts = [
  { org: "Northwind Trading Co", name: "Amara Okafor", email: "a.okafor@northwindtrading.com", phone: "+1 312 555 0148", title: "VP Operations", status: "customer" },
  { org: "Northwind Trading Co", name: "Daniel Reyes", email: "d.reyes@northwindtrading.com", phone: "+1 312 555 0193", title: "Procurement Manager", status: "lead" },
  { org: "Brightline Media", name: "Priya Natarajan", email: "priya@brightline.media", phone: "+1 646 555 0172", title: "Chief Executive Officer", status: "qualified" },
  { org: "Brightline Media", name: "Marcus Webb", email: "marcus@brightline.media", phone: "+1 646 555 0117", title: "Head of Growth", status: "lead" },
  { org: "Atlas Logistics", name: "Sofia Lindqvist", email: "sofia.lindqvist@atlaslogistics.com", phone: "+1 404 555 0126", title: "VP of Sales", status: "qualified" },
  { org: "Atlas Logistics", name: "James Osei", email: "j.osei@atlaslogistics.com", phone: "+1 404 555 0161", title: "Sales Enablement Lead", status: "customer" },
  { org: "Fenwick Robotics", name: "Elena Vasquez", email: "elena@fenwickrobotics.io", phone: "+1 408 555 0139", title: "COO", status: "qualified" },
  { org: "Fenwick Robotics", name: "Tom Bradley", email: "tom@fenwickrobotics.io", phone: "+1 408 555 0155", title: "Head of Procurement", status: "lead" },
  { org: "Harbor & Vine", name: "Grace Kim", email: "grace@harborandvine.com", phone: "+1 415 555 0184", title: "Director of Operations", status: "customer" },
  { org: "Harbor & Vine", name: "Rohan Mehta", email: "rohan@harborandvine.com", phone: "+1 415 555 0140", title: "Regional Manager", status: "lead" },
  { org: "Kestrel Analytics", name: "Nina O'Connell", email: "nina@kestrelanalytics.com", phone: "+1 303 555 0102", title: "Head of Partnerships", status: "qualified" },
  { org: "Kestrel Analytics", name: "David Kimura", email: "david@kestrelanalytics.com", phone: "+1 303 555 0178", title: "Solutions Architect", status: "qualified" },
  { org: "Meridian Health", name: "Dr. Hannah Brooks", email: "h.brooks@meridianhealth.org", phone: "+1 617 555 0122", title: "Chief Information Officer", status: "qualified" },
  { org: "Meridian Health", name: "Liam Gallagher", email: "l.gallagher@meridianhealth.org", phone: "+1 617 555 0191", title: "IT Vendor Manager", status: "lead" },
  { org: "Solstice Energy", name: "Chloe Martin", email: "chloe@solstice.energy", phone: "+1 512 555 0130", title: "Founder & CEO", status: "customer" },
];

type SeedDeal = {
  org: string;
  contact: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  close_date: string;
};

const deals: SeedDeal[] = [
  { org: "Northwind Trading Co", contact: "Amara Okafor", name: "Warehouse Management Suite", stage: "Won", value: 84000, probability: 100, close_date: monthsFromNow(5, 14) },
  { org: "Brightline Media", contact: "Priya Natarajan", name: "Campaign Manager — Annual License", stage: "Won", value: 32000, probability: 100, close_date: monthsFromNow(5, 27) },
  { org: "Atlas Logistics", contact: "James Osei", name: "Field Sales Enablement Platform", stage: "Won", value: 126000, probability: 100, close_date: monthsFromNow(4, 9) },
  { org: "Kestrel Analytics", contact: "David Kimura", name: "Partnership Co-selling Pilot", stage: "Won", value: 21500, probability: 100, close_date: monthsFromNow(3, 18) },
  { org: "Meridian Health", contact: "Liam Gallagher", name: "Compliance Reporting Module", stage: "Won", value: 58000, probability: 100, close_date: monthsFromNow(3, 22) },
  { org: "Harbor & Vine", contact: "Grace Kim", name: "Multi-site Guest CRM", stage: "Won", value: 64300, probability: 100, close_date: monthsFromNow(2, 5) },
  { org: "Solstice Energy", contact: "Chloe Martin", name: "Quoting & Pipeline Automation", stage: "Won", value: 77000, probability: 100, close_date: monthsFromNow(1, 11) },
  { org: "Fenwick Robotics", contact: "Elena Vasquez", name: "Inventory Integration Add-on", stage: "New", value: 28000, probability: 10, close_date: daysFromNow(45) },
  { org: "Harbor & Vine", contact: "Rohan Mehta", name: "Guest Loyalty Program", stage: "New", value: 18000, probability: 15, close_date: daysFromNow(60) },
  { org: "Atlas Logistics", contact: "Sofia Lindqvist", name: "Analytics Dashboard Add-on", stage: "Qualified", value: 42000, probability: 35, close_date: daysFromNow(30) },
  { org: "Brightline Media", contact: "Marcus Webb", name: "Multi-brand Rollout", stage: "Qualified", value: 96000, probability: 40, close_date: daysFromNow(50) },
  { org: "Kestrel Analytics", contact: "Nina O'Connell", name: "Enterprise Data Connector", stage: "Qualified", value: 54000, probability: 30, close_date: daysFromNow(35) },
  { org: "Meridian Health", contact: "Dr. Hannah Brooks", name: "Network-wide Deployment", stage: "Proposal", value: 148000, probability: 60, close_date: daysFromNow(21) },
  { org: "Northwind Trading Co", contact: "Daniel Reyes", name: "Inventory Forecasting Module", stage: "Proposal", value: 36500, probability: 55, close_date: daysFromNow(18) },
  { org: "Solstice Energy", contact: "Chloe Martin", name: "Lead Scoring Engine", stage: "Proposal", value: 61000, probability: 65, close_date: daysFromNow(25) },
  { org: "Fenwick Robotics", contact: "Elena Vasquez", name: "Full Procurement Suite", stage: "Negotiation", value: 132000, probability: 80, close_date: daysFromNow(12) },
  { org: "Brightline Media", contact: "Priya Natarajan", name: "Campaign Manager Expansion", stage: "Negotiation", value: 45000, probability: 75, close_date: daysFromNow(15) },
  { org: "Atlas Logistics", contact: "Sofia Lindqvist", name: "Route Optimization Add-on", stage: "Negotiation", value: 39500, probability: 85, close_date: daysFromNow(10) },
  { org: "Meridian Health", contact: "Liam Gallagher", name: "Legacy Migration Project", stage: "Lost", value: 78000, probability: 0, close_date: daysFromNow(-20) },
  { org: "Harbor & Vine", contact: "Grace Kim", name: "Enterprise Catering Module", stage: "Lost", value: 27200, probability: 5, close_date: daysFromNow(-5) },
];

type SeedActivity = {
  contact?: number;
  deal?: number;
  type: string;
  description: string;
  happened: string;
  due?: string;
  done?: boolean;
};

export function seed(db: DatabaseSync): void {
  const count = db.prepare("SELECT COUNT(*) AS c FROM organizations").get() as { c: number };
  if (count.c > 0) return;

  db.exec("BEGIN");
  try {
    const orgInsert = db.prepare("INSERT INTO organizations (name, website, industry, notes, created_at) VALUES (?, ?, ?, ?, ?)");
    const orgIds = new Map<string, number>();
    for (const o of orgs) {
      const r = orgInsert.run(o.name, o.website, o.industry, o.notes, hoursAgo(24 * 60));
      orgIds.set(o.name, Number(r.lastInsertRowid));
    }

    const contactInsert = db.prepare(
      "INSERT INTO contacts (organization_id, name, email, phone, job_title, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const contactIds = new Map<string, number>();
    for (const c of contacts) {
      const r = contactInsert.run(orgIds.get(c.org) as number, c.name, c.email, c.phone, c.title, c.status, hoursAgo(24 * 58));
      contactIds.set(c.name, Number(r.lastInsertRowid));
    }

    const dealInsert = db.prepare(
      "INSERT INTO deals (organization_id, contact_id, name, stage, value, probability, close_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const dealIds = new Map<string, number>();
    for (const d of deals) {
      const r = dealInsert.run(orgIds.get(d.org) as number, contactIds.get(d.contact) as number, d.name, d.stage, d.value, d.probability, d.close_date, hoursAgo(24 * 55));
      dealIds.set(d.name, Number(r.lastInsertRowid));
    }

    const act: SeedActivity[] = [
      { contact: contactIds.get("Daniel Reyes"), type: "call", description: "Intro call — wants pricing for the forecasting module; sends requirements next week.", happened: hoursAgo(2) },
      { contact: contactIds.get("Elena Vasquez"), deal: dealIds.get("Full Procurement Suite"), type: "email", description: "Sent revised proposal with financial terms included. Waiting on legal review.", happened: hoursAgo(5), due: daysFromNow(2) },
      { contact: contactIds.get("Chloe Martin"), deal: dealIds.get("Lead Scoring Engine"), type: "call", description: "Demo walkthrough went well. CFO wants an ROI summary before committing.", happened: hoursAgo(26), due: daysFromNow(3) },
      { contact: contactIds.get("Sofia Lindqvist"), deal: dealIds.get("Route Optimization Add-on"), type: "note", description: "Negotiating on annual maintenance fee. Final decision expected from VP Finance.", happened: hoursAgo(30), due: daysFromNow(1) },
      { contact: contactIds.get("Priya Natarajan"), deal: dealIds.get("Campaign Manager Expansion"), type: "email", description: "Shared contract draft. Priya flagged two clauses for the legal team.", happened: hoursAgo(40) },
      { contact: contactIds.get("Dr. Hannah Brooks"), deal: dealIds.get("Network-wide Deployment"), type: "call", description: "Presented rollout plan to IT steering committee. Security review is the last gate.", happened: hoursAgo(50), due: daysFromNow(5) },
      { contact: contactIds.get("Tom Bradley"), type: "email", description: "Sent product overview and case studies. Following up on procurement interest.", happened: hoursAgo(72) },
      { contact: contactIds.get("Rohan Mehta"), deal: dealIds.get("Guest Loyalty Program"), type: "note", description: "Needs reference calls from two hotel operators before he takes this to the board.", happened: hoursAgo(75), due: daysFromNow(7) },
      { contact: contactIds.get("Nina O'Connell"), deal: dealIds.get("Enterprise Data Connector"), type: "call", description: "Second call — scoped the connector work with their engineering team.", happened: hoursAgo(96), due: daysFromNow(4) },
      { contact: contactIds.get("Daniel Reyes"), deal: dealIds.get("Inventory Forecasting Module"), type: "note", description: "Requirements call booked. Include data-sync question in agenda.", happened: hoursAgo(100) },
      { contact: contactIds.get("Marcus Webb"), deal: dealIds.get("Multi-brand Rollout"), type: "email", description: "Sent capability one-pager for the rollout. He'll present at the monthly growth meeting.", happened: hoursAgo(120), due: daysFromNow(6) },
      { contact: contactIds.get("Grace Kim"), type: "email", description: "Quarterly check-in — happy with the rollout so far. Renewal conversation next month.", happened: hoursAgo(150) },
      { contact: contactIds.get("Amara Okafor"), type: "note", description: "Renewal call completed; agreed on a mid-year invoice schedule.", happened: hoursAgo(170), due: daysFromNow(-3), done: true },
      { contact: contactIds.get("David Kimura"), type: "call", description: "Deep-dive on API limits for the connector. Confirmed no blockers.", happened: hoursAgo(190) },
      { contact: contactIds.get("Liam Gallagher"), type: "email", description: "Requested the SOC 2 report and an updated security questionnaire.", happened: hoursAgo(210), due: daysFromNow(-1) },
      { contact: contactIds.get("Sofia Lindqvist"), type: "note", description: "Sofia recommended us internally — added to the Q3 enablement budget.", happened: hoursAgo(230) },
      { contact: contactIds.get("Chloe Martin"), deal: dealIds.get("Quoting & Pipeline Automation"), type: "note", description: "Implementation complete. Scheduling training for the field team.", happened: hoursAgo(260), due: daysFromNow(-2), done: true },
      { contact: contactIds.get("Elena Vasquez"), deal: dealIds.get("Inventory Integration Add-on"), type: "call", description: "Kickoff call for the add-on. Engineering lead joining next session.", happened: hoursAgo(300) },
      { contact: contactIds.get("James Osei"), type: "call", description: "Support follow-up on dashboard permissions — resolved same day.", happened: hoursAgo(360), due: daysFromNow(-4), done: true },
      { contact: contactIds.get("Priya Natarajan"), type: "note", description: "Met at the agency summit. Strong interest in the annual license tier.", happened: hoursAgo(420) },
      { contact: contactIds.get("Dr. Hannah Brooks"), type: "email", description: "Sent security whitepaper. CIO's office will confirm the review slot.", happened: hoursAgo(500) },
      { contact: contactIds.get("Chloe Martin"), type: "email", description: "Thank-you note after the site visit — asked to be added to the product newsletter.", happened: hoursAgo(600) },
    ];

    const actInsert = db.prepare(
      "INSERT INTO activities (contact_id, deal_id, type, description, happened_at, due_date, done, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const a of act) {
      actInsert.run(a.contact ?? null, a.deal ?? null, a.type, a.description, a.happened, a.due ?? null, a.done ? 1 : 0, a.happened);
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}