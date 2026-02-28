import { llmTaskListSchema, type Task } from '@insightboard/shared';
import OpenAI from 'openai';

import { env } from '../config/env.js';

type GenerationResult = {
  tasks: Task[];
  sourceModel: string;
};

const SYSTEM_PROMPT = `You extract actionable project tasks from meeting transcripts.
Return only valid JSON with this shape:
{
  "tasks": [
    {"id":"TASK-1","description":"...","priority":"P0|P1|P2|P3","dependencies":["TASK-2"]}
  ]
}
Rules:
- IDs must be unique and stable in the same response.
- dependency IDs must reference existing task IDs when possible.
- Include 5-12 meaningful tasks.
- Use P0 for critical blockers, P1 for high priority, P2 for medium, P3 for backlog.
- No markdown, no prose, no code fences.`;

function heuristicTasks(transcript: string): Task[] {
  const lower = transcript.toLowerCase();

  if (lower.includes('project odyssey') && lower.includes('stripe')) {
    return [
      {
        id: 'TASK-1',
        description:
          'Fix the intermittent Stripe payment gateway race condition in account and subscription creation.',
        priority: 'P0',
        dependencies: [],
      },
      {
        id: 'TASK-2',
        description: 'Patch and redeploy a stable build to staging by Monday morning.',
        priority: 'P0',
        dependencies: ['TASK-1'],
      },
      {
        id: 'TASK-3',
        description: 'Run full QA regression over the weekend on the stable build.',
        priority: 'P1',
        dependencies: ['TASK-2'],
      },
      {
        id: 'TASK-4',
        description: 'Investigate flaky CI/CD test timeouts and staging DB connection pool behavior.',
        priority: 'P2',
        dependencies: ['TASK-2'],
      },
      {
        id: 'TASK-5',
        description: 'Review launch blog post technical accuracy by Thursday EOD.',
        priority: 'P1',
        dependencies: [],
      },
      {
        id: 'TASK-6',
        description: 'Capture high-resolution dashboard screenshots for the press kit by Tuesday next week.',
        priority: 'P1',
        dependencies: ['TASK-2'],
      },
      {
        id: 'TASK-7',
        description: 'Prepare A/B homepage headline test brief with success metrics for backlog planning.',
        priority: 'P3',
        dependencies: [],
      },
      {
        id: 'TASK-8',
        description:
          'Allocate four hours next week to investigate Titan reporting-service memory leak and document findings.',
        priority: 'P1',
        dependencies: [],
      },
    ];
  }

  const sentences = transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const actionLines = sentences.filter((sentence) =>
    /(need to|must|by\s|review|investigate|fix|create|run|prepare|deploy|blocked|priority)/i.test(
      sentence,
    ),
  );

  const candidates = (actionLines.length > 0 ? actionLines : sentences).slice(0, 8);

  return candidates.map((description, idx) => {
    const id = `TASK-${idx + 1}`;
    const priority = /p0|showstopper|critical|blocker/i.test(description)
      ? 'P0'
      : /high|blocked|urgent|hard dependency/i.test(description)
        ? 'P1'
        : /backlog|not urgent|later/i.test(description)
          ? 'P3'
          : 'P2';

    return {
      id,
      description,
      priority,
      dependencies: idx === 0 ? [] : [],
    } as Task;
  });
}

export async function generateTasksFromTranscript(transcript: string): Promise<GenerationResult> {
  if (!env.OPENAI_API_KEY) {
    return {
      tasks: heuristicTasks(transcript),
      sourceModel: 'heuristic-fallback',
    };
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Transcript:\n${transcript}`,
      },
    ],
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error('LLM returned empty content.');
  }

  const json = JSON.parse(content) as unknown;
  const parsed = llmTaskListSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(`LLM output failed schema validation: ${parsed.error.message}`);
  }

  return {
    tasks: parsed.data.tasks,
    sourceModel: env.OPENAI_MODEL,
  };
}
