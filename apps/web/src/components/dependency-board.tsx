'use client';

import { type EnrichedTask } from '@insightboard/shared';
import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

import { createJob, getJob } from '../lib/api';
import { deriveStatus, toFlow } from '../lib/graph';

const DEMO_TRANSCRIPT = `Paste a transcript and submit, or use the script in README to preload sample input.`;

function statusClasses(status: 'Ready' | 'Blocked' | 'Completed' | 'Error'): string {
  if (status === 'Ready') return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200';
  if (status === 'Completed') return 'border-sky-400/50 bg-sky-500/10 text-sky-200';
  if (status === 'Error') return 'border-rose-400/50 bg-rose-500/10 text-rose-200';
  return 'border-amber-400/50 bg-amber-500/10 text-amber-200';
}

export function DependencyBoard() {
  const [transcript, setTranscript] = useState(DEMO_TRANSCRIPT);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!jobId || (status !== 'pending' && status !== 'processing')) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        setStatus(job.status);

        if (job.status === 'completed' && job.graph) {
          setTasks(job.graph.tasks);
          clearInterval(timer);
        }

        if (job.status === 'failed') {
          setError(job.error || 'Job failed');
          clearInterval(timer);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Polling failed');
        setStatus('failed');
        clearInterval(timer);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [jobId, status]);

  const { nodes, edges, errorTaskIds } = useMemo(() => {
    if (tasks.length === 0) {
      return { nodes: [], edges: [], errorTaskIds: new Set<string>() };
    }

    return toFlow(
      {
        tasks,
        metadata: {
          cycleDetected: tasks.some((task) => task.isInCycle),
          cycleTaskIds: tasks.filter((task) => task.isInCycle).map((task) => task.id),
          generatedAt: new Date().toISOString(),
          sourceModel: 'ui',
        },
      },
      completedTaskIds,
    );
  }, [tasks, completedTaskIds]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setStatus('pending');
    setCompletedTaskIds(new Set());
    setTasks([]);

    try {
      const created = await createJob(transcript);
      setJobId(created.jobId);

      if (created.status === 'completed' || created.status === 'failed') {
        const job = await getJob(created.jobId);
        setStatus(job.status);

        if (job.status === 'completed' && job.graph) {
          setTasks(job.graph.tasks);
        }

        if (job.status === 'failed') {
          setError(job.error || 'Job failed');
        }
        return;
      }

      setStatus(created.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit transcript');
      setStatus('failed');
    }
  };

  const completeTask = (task: EnrichedTask) => {
    const computed = deriveStatus(task, completedTaskIds, errorTaskIds);
    if (computed !== 'Ready') {
      return;
    }

    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(task.id);
      return next;
    });
  };

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
      <div className="surface rounded-2xl p-4 card-animate">
        <h2 className="text-lg font-semibold">Transcript Input</h2>
        <p className="mt-1 text-sm text-slate-300">
          Backend runs async extraction and returns a validated dependency graph.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <textarea
            className="h-52 w-full rounded-xl border border-slate-500/40 bg-slate-950/70 p-3 text-sm outline-none focus:border-sky-300"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste meeting transcript here..."
          />

          <button
            className="w-full rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:opacity-60"
            disabled={!transcript.trim() || status === 'pending' || status === 'processing'}
            type="submit"
          >
            {status === 'pending' || status === 'processing' ? 'Processing...' : 'Generate Dependency Graph'}
          </button>
        </form>

        <div className="mt-3 rounded-xl border border-slate-500/30 bg-slate-900/40 p-3 text-xs">
          <p className="font-medium text-slate-100">Job status: {status}</p>
          {jobId ? <p className="mt-1 text-slate-300">jobId: {jobId}</p> : null}
          {error ? <p className="mt-2 text-rose-300">{error}</p> : null}
        </div>

        <div className="mt-4 space-y-2">
          {tasks.map((task) => {
            const computed = deriveStatus(task, completedTaskIds, errorTaskIds);
            return (
              <article key={task.id} className={`rounded-xl border p-3 text-xs ${statusClasses(computed)}`}>
                <p className="font-mono text-[11px]">{task.id}</p>
                <p className="mt-1 font-semibold">{task.description}</p>
                <p className="mt-1 text-[11px] opacity-85">Priority: {task.priority}</p>
                {task.dependencies.length > 0 ? (
                  <p className="mt-1 text-[11px] opacity-85">Depends on: {task.dependencies.join(', ')}</p>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold">{computed}</span>
                  <button
                    className="rounded-md border border-current px-2 py-1 text-[11px] disabled:opacity-50"
                    disabled={computed !== 'Ready'}
                    onClick={() => completeTask(task)}
                    type="button"
                  >
                    Complete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="surface rounded-2xl p-2 card-animate">
        <div className="h-[650px] rounded-xl border border-slate-500/30 bg-slate-950/60">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => {
              const task = tasks.find((item) => item.id === node.id);
              if (task) {
                completeTask(task);
              }
            }}
          >
            <Background color="#17344f" />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </section>
  );
}
