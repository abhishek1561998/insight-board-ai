import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

import { env } from '../config/env.js';

let sqlClient: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    if (!env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL environment variable is required');
    }
    sqlClient = neon(env.POSTGRES_URL);
  }
  return sqlClient;
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return getClient()(strings, ...values);
}

export async function initDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      transcript TEXT NOT NULL,
      normalized_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      error TEXT,
      graph_json TEXT,
      source_model TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at)
  `;
}
