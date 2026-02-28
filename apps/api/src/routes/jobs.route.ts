import { dependencyGraphSchema, type DependencyGraph } from '@insightboard/shared';
import { Router } from 'express';
import { z } from 'zod';

import {
  createSubmissionWithJob,
  findJob,
  findSubmissionWithJobByHash,
} from '../db/repository.js';
import { transcriptHash } from '../lib/hash.js';
import { jobQueue } from '../worker/queue.js';

const createJobSchema = z.object({
  transcript: z.string().min(1),
});

export const jobRouter = Router();
const allowedStatuses = ['Ready', 'Blocked', 'Completed', 'Error'] as const;
type AllowedStatus = (typeof allowedStatuses)[number];

function coerceGraph(raw: unknown): DependencyGraph | null {
  const strict = dependencyGraphSchema.safeParse(raw);
  if (strict.success) {
    return strict.data;
  }

  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { tasks?: unknown }).tasks)) {
    return null;
  }

  const now = new Date().toISOString();
  const tasks = (raw as { tasks: unknown[] }).tasks
    .map((task) => {
      if (!task || typeof task !== 'object') {
        return null;
      }

      const candidate = task as Record<string, unknown>;
      const id = typeof candidate.id === 'string' ? candidate.id : null;
      const description = typeof candidate.description === 'string' ? candidate.description : null;
      const priority = candidate.priority;
      const dependencies = Array.isArray(candidate.dependencies)
        ? candidate.dependencies.filter((dep): dep is string => typeof dep === 'string')
        : [];

      if (!id || !description || !['P0', 'P1', 'P2', 'P3'].includes(String(priority))) {
        return null;
      }

      const status: AllowedStatus =
        typeof candidate.status === 'string' &&
        (allowedStatuses as readonly string[]).includes(candidate.status)
          ? (candidate.status as AllowedStatus)
          : dependencies.length > 0
            ? 'Blocked'
            : 'Ready';

      return {
        id,
        description,
        priority: priority as 'P0' | 'P1' | 'P2' | 'P3',
        dependencies,
        status,
        blockedReason:
          typeof candidate.blockedReason === 'string' ? candidate.blockedReason : undefined,
        invalidDependenciesRemoved: Array.isArray(candidate.invalidDependenciesRemoved)
          ? candidate.invalidDependenciesRemoved.filter(
              (dep): dep is string => typeof dep === 'string',
            )
          : [],
        isInCycle: Boolean(candidate.isInCycle),
      };
    })
    .filter((task): task is NonNullable<typeof task> => task !== null);

  const normalized: DependencyGraph = {
    tasks,
    metadata: {
      cycleDetected: tasks.some((task) => task.isInCycle),
      cycleTaskIds: tasks.filter((task) => task.isInCycle).map((task) => task.id),
      generatedAt:
        raw &&
        typeof raw === 'object' &&
        typeof (raw as { metadata?: { generatedAt?: unknown } }).metadata?.generatedAt === 'string'
          ? (raw as { metadata: { generatedAt: string } }).metadata.generatedAt
          : now,
      sourceModel:
        raw &&
        typeof raw === 'object' &&
        typeof (raw as { metadata?: { sourceModel?: unknown } }).metadata?.sourceModel === 'string'
          ? (raw as { metadata: { sourceModel: string } }).metadata.sourceModel
          : 'unknown',
    },
  };

  const parsed = dependencyGraphSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

jobRouter.post('/jobs', async (req, res) => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten(),
    });
  }

  const transcript = parsed.data.transcript.trim();
  const normalizedHash = transcriptHash(transcript);

  const existing = findSubmissionWithJobByHash(normalizedHash);

  if (existing?.jobId) {
    return res.status(202).json({
      jobId: existing.jobId,
      status: existing.status,
      deduplicated: true,
    });
  }

  try {
    const created = createSubmissionWithJob(transcript, normalizedHash);

    jobQueue.enqueue(created.jobId);

    return res.status(202).json({
      jobId: created.jobId,
      status: 'pending',
      deduplicated: false,
    });
  } catch (error) {
    const fallback = findSubmissionWithJobByHash(normalizedHash);
    if (fallback?.jobId) {
      return res.status(202).json({
        jobId: fallback.jobId,
        status: fallback.status,
        deduplicated: true,
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create job',
    });
  }
});

jobRouter.get('/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;

  const job = findJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  let graph = null;
  if (job.graphJson) {
    try {
      graph = coerceGraph(JSON.parse(job.graphJson) as unknown);
    } catch {
      graph = null;
    }
  }

  return res.status(200).json({
    jobId: job.jobId,
    status: job.status,
    error: job.error,
    sourceModel: job.sourceModel,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    submissionId: job.submissionId,
    graph,
  });
});
