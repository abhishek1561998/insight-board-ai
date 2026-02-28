import {
  findJob,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
} from '../db/repository.js';
import { buildGraphFromTranscript } from '../services/graph.service.js';

class JobQueue {
  private readonly queue: string[] = [];
  private processing = false;

  enqueue(jobId: string): void {
    this.queue.push(jobId);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) {
        continue;
      }

      await this.processJob(jobId);
    }

    this.processing = false;
  }

  private async processJob(jobId: string): Promise<void> {
    try {
      await markJobProcessing(jobId);
      const job = await findJob(jobId);

      if (!job) {
        return;
      }

      const graph = await buildGraphFromTranscript(job.transcript);
      await markJobCompleted(jobId, JSON.stringify(graph), graph.metadata.sourceModel);
    } catch (error) {
      await markJobFailed(jobId, error instanceof Error ? error.message : 'Unknown processing failure');
    }
  }
}

export const jobQueue = new JobQueue();
