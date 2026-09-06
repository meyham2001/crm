import Database from 'better-sqlite3'
import { resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'

const DATA_DIR = resolve(process.cwd(), 'data')
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = resolve(DATA_DIR, 'crm.db')

export const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT,
      industry TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      job_title TEXT,
      status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'qualified', 'customer')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      contact_id TEXT,
      name TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
      value REAL NOT NULL DEFAULT 0,
      probability REAL NOT NULL DEFAULT 0,
      close_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      contact_id TEXT,
      deal_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('note', 'call', 'email')),
      description TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      due_date TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
    CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON deals(organization_id);
    CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
    CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
    CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
    CREATE INDEX IF NOT EXISTS idx_activities_occurred_at ON activities(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);
    CREATE INDEX IF NOT EXISTS idx_activities_done ON activities(done);
  `)

  const triggerOrg = db.prepare(`
    CREATE TRIGGER IF NOT EXISTS update_organizations_timestamp
    AFTER UPDATE ON organizations
    BEGIN
      UPDATE organizations SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `)
  triggerOrg.run()

  const triggerContact = db.prepare(`
    CREATE TRIGGER IF NOT EXISTS update_contacts_timestamp
    AFTER UPDATE ON contacts
    BEGIN
      UPDATE contacts SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `)
  triggerContact.run()

  const triggerDeal = db.prepare(`
    CREATE TRIGGER IF NOT EXISTS update_deals_timestamp
    AFTER UPDATE ON deals
    BEGIN
      UPDATE deals SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `)
  triggerDeal.run()

  const triggerActivity = db.prepare(`
    CREATE TRIGGER IF NOT EXISTS update_activities_timestamp
    AFTER UPDATE ON activities
    BEGIN
      UPDATE activities SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `)
  triggerActivity.run()
}

export function closeDatabase() {
  db.close()
}