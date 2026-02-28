import { describe, expect, it } from 'vitest';

import { buildDependencyGraph } from './dependency-engine.js';

describe('buildDependencyGraph', () => {
  it('removes invalid dependency IDs', () => {
    const graph = buildDependencyGraph(
      [
        { id: 'A', description: 'Task A', priority: 'P1', dependencies: ['MISSING'] },
        { id: 'B', description: 'Task B', priority: 'P1', dependencies: ['A'] },
      ],
      'test-model',
    );

    const taskA = graph.tasks.find((task) => task.id === 'A');
    expect(taskA?.dependencies).toEqual([]);
    expect(taskA?.invalidDependenciesRemoved).toEqual(['MISSING']);
  });

  it('marks cycle tasks as Error', () => {
    const graph = buildDependencyGraph(
      [
        { id: 'A', description: 'Task A', priority: 'P1', dependencies: ['B'] },
        { id: 'B', description: 'Task B', priority: 'P1', dependencies: ['A'] },
      ],
      'test-model',
    );

    expect(graph.metadata.cycleDetected).toBe(true);
    expect(graph.metadata.cycleTaskIds.sort()).toEqual(['A', 'B']);
    expect(graph.tasks.every((task) => task.status === 'Error')).toBe(true);
  });
});
