import { randomUUID } from 'node:crypto';

import { sql } from './client.js';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type SubmissionJobRow = {
  submissionId: string;
  transcript: string;
  normalizedHash: string;
  jobId: string;
  status: JobStatus;
  error: string | null;
  graphJson: string | null;
  sourceModel: string | null;
  jobCreatedAt: string;
  jobUpdatedAt: string;
};

export type JobRow = {
  jobId: string;
  submissionId: string;
  status: JobStatus;
  error: string | null;
  graphJson: string | null;
  sourceModel: string | null;
  transcript: string;
  createdAt: string;
  updatedAt: string;
};

export async function findSubmissionWithJobByHash(
  normalizedHash: string,
): Promise<SubmissionJobRow | null> {
  const rows = await sql`
    SELECT
      s.id AS "submissionId",
      s.transcript AS transcript,
      s.normalized_hash AS "normalizedHash",
      j.id AS "jobId",
      j.status AS status,
      j.error AS error,
      j.graph_json AS "graphJson",
      j.source_model AS "sourceModel",
      j.created_at AS "jobCreatedAt",
      j.updated_at AS "jobUpdatedAt"
    FROM submissions s
    JOIN jobs j ON j.submission_id = s.id
    WHERE s.normalized_hash = ${normalizedHash}
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    submissionId: row.submissionId as string,
    transcript: row.transcript as string,
    normalizedHash: row.normalizedHash as string,
    jobId: row.jobId as string,
    status: row.status as JobStatus,
    error: row.error as string | null,
    graphJson: row.graphJson as string | null,
    sourceModel: row.sourceModel as string | null,
    jobCreatedAt: row.jobCreatedAt as string,
    jobUpdatedAt: row.jobUpdatedAt as string,
  };
}

export async function createSubmissionWithJob(
  transcript: string,
  normalizedHash: string,
): Promise<{ submissionId: string; jobId: string }> {
  const now = new Date().toISOString();
  const submissionId = randomUUID();
  const jobId = randomUUID();

  await sql`
    INSERT INTO submissions (id, transcript, normalized_hash, created_at, updated_at)
    VALUES (${submissionId}, ${transcript}, ${normalizedHash}, ${now}, ${now})
  `;

  await sql`
    INSERT INTO jobs (id, submission_id, status, created_at, updated_at)
    VALUES (${jobId}, ${submissionId}, 'pending', ${now}, ${now})
  `;

  return { submissionId, jobId };
}

export async function findJob(jobId: string): Promise<JobRow | null> {
  const rows = await sql`
    SELECT
      j.id AS "jobId",
      j.submission_id AS "submissionId",
      j.status AS status,
      j.error AS error,
      j.graph_json AS "graphJson",
      j.source_model AS "sourceModel",
      s.transcript AS transcript,
      j.created_at AS "createdAt",
      j.updated_at AS "updatedAt"
    FROM jobs j
    JOIN submissions s ON s.id = j.submission_id
    WHERE j.id = ${jobId}
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    jobId: row.jobId as string,
    submissionId: row.submissionId as string,
    status: row.status as JobStatus,
    error: row.error as string | null,
    graphJson: row.graphJson as string | null,
    sourceModel: row.sourceModel as string | null,
    transcript: row.transcript as string,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function markJobProcessing(jobId: string): Promise<void> {
  const now = new Date().toISOString();
  await sql`
    UPDATE jobs
    SET status = 'processing', error = NULL, updated_at = ${now}
    WHERE id = ${jobId}
  `;
}

export async function markJobCompleted(
  jobId: string,
  graphJson: string,
  sourceModel: string,
): Promise<void> {
  const now = new Date().toISOString();
  await sql`
    UPDATE jobs
    SET status = 'completed', graph_json = ${graphJson}, source_model = ${sourceModel}, error = NULL, updated_at = ${now}
    WHERE id = ${jobId}
  `;
}

export async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
  const now = new Date().toISOString();
  await sql`
    UPDATE jobs
    SET status = 'failed', error = ${errorMessage}, updated_at = ${now}
    WHERE id = ${jobId}
  `;
}
