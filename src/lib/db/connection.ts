import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CREATE_TABLES_SQL } from './schema';

let db: Database.Database | null = null;
let seeded = false;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'support.db');

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(CREATE_TABLES_SQL);

  // Schema migrations — add columns that may not exist in older DBs
  const migrations = [
    `ALTER TABLE tickets ADD COLUMN satisfaction_rating INTEGER DEFAULT NULL CHECK(satisfaction_rating BETWEEN 1 AND 5)`,
    `ALTER TABLE tickets ADD COLUMN sentiment TEXT DEFAULT NULL CHECK(sentiment IN ('positive', 'neutral', 'negative'))`,
    `ALTER TABLE tickets ADD COLUMN frustration_score REAL DEFAULT NULL CHECK(frustration_score BETWEEN 0.0 AND 1.0)`,
  ];
  for (const migration of migrations) {
    try { db.exec(migration); } catch { /* Column already exists */ }
  }

  return db;
}

export function isSeeded(): boolean {
  return seeded;
}

export function markSeeded(): void {
  seeded = true;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
