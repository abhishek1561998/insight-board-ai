import { randomUUID } from 'node:crypto';

import { db } from './client.js';

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

const findSubmissionStmt = db.prepare(`
  SELECT
    s.id AS submissionId,
    s.transcript AS transcript,
    s.normalized_hash AS normalizedHash,
    j.id AS jobId,
    j.status AS status,
    j.error AS error,
    j.graph_json AS graphJson,
    j.source_model AS sourceModel,
    j.created_at AS jobCreatedAt,
    j.updated_at AS jobUpdatedAt
  FROM submissions s
  JOIN jobs j ON j.submission_id = s.id
  WHERE s.normalized_hash = ?
`);

const findJobStmt = db.prepare(`
  SELECT
    j.id AS jobId,
    j.submission_id AS submissionId,
    j.status AS status,
    j.error AS error,
    j.graph_json AS graphJson,
    j.source_model AS sourceModel,
    s.transcript AS transcript,
    j.created_at AS createdAt,
    j.updated_at AS updatedAt
  FROM jobs j
  JOIN submissions s ON s.id = j.submission_id
  WHERE j.id = ?
`);

const createSubmissionStmt = db.prepare(`
  INSERT INTO submissions (id, transcript, normalized_hash, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);

const createJobStmt = db.prepare(`
  INSERT INTO jobs (id, submission_id, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);

const updateJobProcessingStmt = db.prepare(`
  UPDATE jobs
  SET status = 'processing', error = NULL, updated_at = ?
  WHERE id = ?
`);

const updateJobCompletedStmt = db.prepare(`
  UPDATE jobs
  SET status = 'completed', graph_json = ?, source_model = ?, error = NULL, updated_at = ?
  WHERE id = ?
`);

const updateJobFailedStmt = db.prepare(`
  UPDATE jobs
  SET status = 'failed', error = ?, updated_at = ?
  WHERE id = ?
`);

const createSubmissionWithJobTx = db.transaction((transcript: string, normalizedHash: string) => {
  const now = new Date().toISOString();
  const submissionId = randomUUID();
  const jobId = randomUUID();

  createSubmissionStmt.run(submissionId, transcript, normalizedHash, now, now);
  createJobStmt.run(jobId, submissionId, 'pending', now, now);

  return {
    submissionId,
    jobId,
  };
});

export function findSubmissionWithJobByHash(normalizedHash: string): SubmissionJobRow | null {
  return (findSubmissionStmt.get(normalizedHash) as SubmissionJobRow | undefined) ?? null;
}

export function createSubmissionWithJob(transcript: string, normalizedHash: string): {
  submissionId: string;
  jobId: string;
} {
  return createSubmissionWithJobTx(transcript, normalizedHash);
}

export function findJob(jobId: string): JobRow | null {
  return (findJobStmt.get(jobId) as JobRow | undefined) ?? null;
}

export function markJobProcessing(jobId: string): void {
  updateJobProcessingStmt.run(new Date().toISOString(), jobId);
}

export function markJobCompleted(jobId: string, graphJson: string, sourceModel: string): void {
  updateJobCompletedStmt.run(graphJson, sourceModel, new Date().toISOString(), jobId);
}

export function markJobFailed(jobId: string, errorMessage: string): void {
  updateJobFailedStmt.run(errorMessage, new Date().toISOString(), jobId);
}
