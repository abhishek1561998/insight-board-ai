import type { DependencyGraph, EnrichedTask, Task } from '@insightboard/shared';

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function detectCycleTaskIds(tasks: Array<Pick<Task, 'id' | 'dependencies'>>): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const task of tasks) {
    adjacency.set(task.id, task.dependencies);
  }

  let index = 0;
  const indexMap = new Map<string, number>();
  const lowMap = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycleIds = new Set<string>();

  const strongConnect = (nodeId: string): void => {
    indexMap.set(nodeId, index);
    lowMap.set(nodeId, index);
    index += 1;

    stack.push(nodeId);
    onStack.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (!indexMap.has(neighbor)) {
        strongConnect(neighbor);
        lowMap.set(nodeId, Math.min(lowMap.get(nodeId)!, lowMap.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowMap.set(nodeId, Math.min(lowMap.get(nodeId)!, indexMap.get(neighbor)!));
      }
    }

    if (lowMap.get(nodeId) === indexMap.get(nodeId)) {
      const component: string[] = [];
      while (stack.length > 0) {
        const popped = stack.pop()!;
        onStack.delete(popped);
        component.push(popped);
        if (popped === nodeId) {
          break;
        }
      }

      if (component.length > 1) {
        for (const id of component) {
          cycleIds.add(id);
        }
      } else {
        const only = component[0]!;
        if ((adjacency.get(only) ?? []).includes(only)) {
          cycleIds.add(only);
        }
      }
    }
  };

  for (const task of tasks) {
    if (!indexMap.has(task.id)) {
      strongConnect(task.id);
    }
  }

  return cycleIds;
}

export function buildDependencyGraph(tasks: Task[], sourceModel: string): DependencyGraph {
  const deduped: Task[] = [];
  const seenIds = new Set<string>();

  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      continue;
    }
    seenIds.add(task.id);
    deduped.push(task);
  }

  const validIds = new Set(deduped.map((task) => task.id));

  const sanitized: EnrichedTask[] = deduped.map((task) => {
    const uniqueDeps = unique(task.dependencies);
    const invalidDependenciesRemoved = uniqueDeps.filter((dep) => !validIds.has(dep));
    const dependencies = uniqueDeps.filter((dep) => validIds.has(dep));

    return {
      id: task.id,
      description: task.description,
      priority: task.priority,
      dependencies,
      status: dependencies.length === 0 ? 'Ready' : 'Blocked',
      blockedReason: dependencies.length === 0 ? undefined : `Waiting on: ${dependencies.join(', ')}`,
      invalidDependenciesRemoved,
      isInCycle: false,
    };
  });

  const cycleTaskIds = detectCycleTaskIds(sanitized);

  for (const task of sanitized) {
    if (cycleTaskIds.has(task.id)) {
      task.status = 'Error';
      task.blockedReason = 'Circular dependency detected.';
      task.isInCycle = true;
    }
  }

  return {
    tasks: sanitized,
    metadata: {
      cycleDetected: cycleTaskIds.size > 0,
      cycleTaskIds: [...cycleTaskIds],
      generatedAt: new Date().toISOString(),
      sourceModel,
    },
  };
}
