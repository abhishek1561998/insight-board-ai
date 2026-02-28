import type { DependencyGraph } from '@insightboard/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';

type CreateJobResponse = {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  deduplicated: boolean;
};

type JobStatusResponse = {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  graph: DependencyGraph | null;
};

export async function createJob(transcript: string): Promise<CreateJobResponse> {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok) {
    throw new Error(`Job creation failed with ${response.status}`);
  }

  return (await response.json()) as CreateJobResponse;
}

export async function getJob(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Job fetch failed with ${response.status}`);
  }

  return (await response.json()) as JobStatusResponse;
}
