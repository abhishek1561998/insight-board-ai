import type { DependencyGraph } from '@insightboard/shared';

import { buildDependencyGraph } from '../lib/dependency-engine.js';
import { generateTasksFromTranscript } from './llm.service.js';

export async function buildGraphFromTranscript(transcript: string): Promise<DependencyGraph> {
  const { tasks, sourceModel } = await generateTasksFromTranscript(transcript);
  return buildDependencyGraph(tasks, sourceModel);
}
