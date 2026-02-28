import { z } from 'zod';

export const taskPrioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);

export const taskSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  priority: taskPrioritySchema,
  dependencies: z.array(z.string().min(1)).default([]),
});

export const taskStatusSchema = z.enum(['Ready', 'Blocked', 'Completed', 'Error']);

export const enrichedTaskSchema = taskSchema.extend({
  status: taskStatusSchema,
  blockedReason: z.string().optional(),
  invalidDependenciesRemoved: z.array(z.string()).default([]),
  isInCycle: z.boolean().default(false),
});

export const dependencyGraphSchema = z.object({
  tasks: z.array(enrichedTaskSchema),
  metadata: z.object({
    cycleDetected: z.boolean(),
    cycleTaskIds: z.array(z.string()).default([]),
    generatedAt: z.string(),
    sourceModel: z.string(),
  }),
});

export const llmTaskListSchema = z.object({
  tasks: z.array(taskSchema),
});

export type Task = z.infer<typeof taskSchema>;
export type EnrichedTask = z.infer<typeof enrichedTaskSchema>;
export type DependencyGraph = z.infer<typeof dependencyGraphSchema>;
export type LlmTaskList = z.infer<typeof llmTaskListSchema>;

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
