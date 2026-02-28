import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from '../config/env.js';

function resolveDatabasePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must be a sqlite file URL, e.g. file:./data/dev.db');
  }

  const relativePath = databaseUrl.slice('file:'.length);
  const currentFile = fileURLToPath(import.meta.url);
  const appRoot = path.resolve(path.dirname(currentFile), '../../');
  return path.resolve(appRoot, relativePath);
}

export const db = new Database(resolveDatabasePath(env.DATABASE_URL));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      transcript TEXT NOT NULL,
      normalized_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      error TEXT,
      graph_json TEXT,
      source_model TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at);
  `);
}
