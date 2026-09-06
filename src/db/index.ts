import { initializeDatabase } from './database'
import { seedDatabase } from './seed'

export function initDB() {
  initializeDatabase()
  seedDatabase()
}