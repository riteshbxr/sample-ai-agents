import { test } from 'node:test';
import assert from 'node:assert';
import {
  CheckpointStore,
  StatefulAgent,
  TaskStateManager,
} from '../../src/services/state-persistence-service.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

// CheckpointStore tests
test('CheckpointStore - save checkpoint', async () => {
  const store = new CheckpointStore();

  const checkpoint = await store.save('thread_1', { data: 'test data' });

  assert.ok(checkpoint.id);
  assert.ok(checkpoint.timestamp);
  assert.strictEqual(checkpoint.data, 'test data');
});

test('CheckpointStore - get latest checkpoint', async () => {
  const store = new CheckpointStore();

  await store.save('thread_1', { step: 1 });
  await store.save('thread_1', { step: 2 });
  const latest = await store.getLatest('thread_1');

  assert.strictEqual(latest.step, 2);
});

test('CheckpointStore - get latest checkpoint returns null for empty thread', async () => {
  const store = new CheckpointStore();

  const latest = await store.getLatest('thread_empty');

  assert.strictEqual(latest, null);
});

test('CheckpointStore - get all checkpoints', async () => {
  const store = new CheckpointStore();

  await store.save('thread_1', { step: 1 });
  await store.save('thread_1', { step: 2 });
  await store.save('thread_1', { step: 3 });

  const all = await store.getAll('thread_1');

  assert.strictEqual(all.length, 3);
  assert.strictEqual(all[0].step, 1);
  assert.strictEqual(all[2].step, 3);
});

test('CheckpointStore - clear checkpoints', async () => {
  const store = new CheckpointStore();

  await store.save('thread_1', { data: 'test' });
  await store.clear('thread_1');

  const latest = await store.getLatest('thread_1');
  assert.strictEqual(latest, null);
});

test('CheckpointStore - separate threads maintain separate checkpoints', async () => {
  const store = new CheckpointStore();

  await store.save('thread_1', { data: 'thread1' });
  await store.save('thread_2', { data: 'thread2' });

  const t1 = await store.getLatest('thread_1');
  const t2 = await store.getLatest('thread_2');

  assert.strictEqual(t1.data, 'thread1');
  assert.strictEqual(t2.data, 'thread2');
});

// StatefulAgent tests
test('StatefulAgent - constructor initializes state', () => {
  const store = new CheckpointStore();
  const agent = new StatefulAgent('mock', store);

  assert.strictEqual(agent.state.step, 0);
  assert.ok(Array.isArray(agent.state.completed));
  assert.ok(typeof agent.state.results === 'object');
  assert.ok(agent.client instanceof MockAIClient);
});

test('StatefulAgent - checkpoint saves state', async () => {
  const store = new CheckpointStore();
  const agent = new StatefulAgent('mock', store);

  agent.state.step = 2;
  agent.state.completed.push('step1', 'step2');

  const checkpoint = await agent.checkpoint('thread_1');

  assert.ok(checkpoint.id);
  assert.strictEqual(checkpoint.state.step, 2);
  assert.strictEqual(checkpoint.state.completed.length, 2);
  assert.ok(agent.client instanceof MockAIClient);
});

test('StatefulAgent - restore state from checkpoint', async () => {
  const store = new CheckpointStore();
  const agent = new StatefulAgent('mock', store);

  agent.state.step = 3;
  agent.state.completed = ['step1', 'step2', 'step3'];
  await agent.checkpoint('thread_1');

  // Create new agent and restore
  const agent2 = new StatefulAgent('mock', store);
  const restored = await agent2.restore('thread_1');

  assert.strictEqual(restored, true);
  assert.strictEqual(agent2.state.step, 3);
  assert.strictEqual(agent2.state.completed.length, 3);
  assert.ok(agent2.client instanceof MockAIClient);
});

test('StatefulAgent - restore returns false when no checkpoint', async () => {
  const store = new CheckpointStore();
  const agent = new StatefulAgent('mock', store);

  const restored = await agent.restore('thread_empty');

  assert.strictEqual(restored, false);
  assert.ok(agent.client instanceof MockAIClient);
});

test('StatefulAgent - execute workflow', async () => {
  const store = new CheckpointStore();
  const agent = new StatefulAgent('mock', store);

  const steps = [
    {
      name: 'step1',
      execute: async (state) => {
        state.metadata.step1Done = true;
        return 'result1';
      },
    },
    {
      name: 'step2',
      execute: async (state) => {
        state.metadata.step2Done = true;
        return 'result2';
      },
    },
  ];

  const finalState = await agent.executeWorkflow('thread_1', steps);

  assert.strictEqual(finalState.step, 2);
  assert.strictEqual(finalState.completed.length, 2);
  assert.strictEqual(finalState.results.step1, 'result1');
  assert.strictEqual(finalState.results.step2, 'result2');
  assert.strictEqual(finalState.metadata.step1Done, true);
  assert.strictEqual(finalState.metadata.step2Done, true);
  assert.ok(agent.client instanceof MockAIClient);
});

test('StatefulAgent - execute workflow resumes from checkpoint', async () => {
  const store = new CheckpointStore();
  const agent = new StatefulAgent('mock', store);

  const steps = [
    {
      name: 'step1',
      execute: async (state) => {
        state.metadata.step1Done = true;
        return 'result1';
      },
    },
    {
      name: 'step2',
      execute: async (state) => {
        state.metadata.step2Done = true;
        return 'result2';
      },
    },
  ];

  // Execute first step
  await agent.executeWorkflow('thread_1', [steps[0]]);

  // Create new agent and resume
  const agent2 = new StatefulAgent('mock', store);
  const finalState = await agent2.executeWorkflow('thread_1', steps);

  assert.strictEqual(finalState.step, 2);
  assert.ok(finalState.completed.includes('step1'));
  assert.ok(finalState.completed.includes('step2'));
  assert.ok(agent.client instanceof MockAIClient);
  assert.ok(agent2.client instanceof MockAIClient);
});

test('StatefulAgent - execute workflow handles interruption', async () => {
  const store = new CheckpointStore();
  const agent = new StatefulAgent('mock', store);

  const steps = [
    {
      name: 'step1',
      execute: async (state) => 'result1',
    },
    {
      name: 'step2',
      simulateInterruption: true,
      execute: async (state) => 'result2',
    },
  ];

  await assert.rejects(
    async () => {
      await agent.executeWorkflow('thread_1', steps);
    },
    {
      message: /Workflow interrupted/,
    }
  );

  // Check that step1 was checkpointed
  const checkpoint = await store.getLatest('thread_1');
  assert.ok(checkpoint);
  assert.ok(checkpoint.state.completed.includes('step1'));
  assert.ok(agent.client instanceof MockAIClient);
});

// TaskStateManager tests
test('TaskStateManager - create task', () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  const task = manager.createTask('task_1', 'context_1', { priority: 'high' });

  assert.strictEqual(task.id, 'task_1');
  assert.strictEqual(task.contextId, 'context_1');
  assert.strictEqual(task.status.state, 'submitted');
  assert.ok(task.metadata.ttl);
  assert.strictEqual(task.metadata.priority, 'high');
});

test('TaskStateManager - update task status', () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  manager.createTask('task_1', 'context_1');
  const updated = manager.updateTaskStatus('task_1', 'working', 'Processing...');

  assert.strictEqual(updated.status.state, 'working');
  assert.strictEqual(updated.status.message, 'Processing...');
  assert.ok(updated.status.timestamp);
});

test('TaskStateManager - update task status throws for non-existent task', () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  assert.throws(
    () => {
      manager.updateTaskStatus('nonexistent', 'working');
    },
    {
      message: /Task nonexistent not found/,
    }
  );
});

test('TaskStateManager - get task', () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  const created = manager.createTask('task_1', 'context_1');
  const retrieved = manager.getTask('task_1');

  assert.strictEqual(retrieved.id, created.id);
  assert.strictEqual(retrieved.contextId, created.contextId);
});

test('TaskStateManager - get task returns null for non-existent task', () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  const task = manager.getTask('nonexistent');

  assert.strictEqual(task, undefined);
});

test('TaskStateManager - check task completion', async () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  manager.createTask('task_1', 'context_1');
  manager.updateTaskStatus('task_1', 'working');

  // Save a checkpoint indicating completion
  await store.save('context_1', { completed: true });

  const completed = await manager.checkTaskCompletion('task_1');

  assert.ok(completed);
  assert.strictEqual(completed.status.state, 'input-required');
});

test('TaskStateManager - check task completion returns null when not complete', async () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  manager.createTask('task_1', 'context_1');
  manager.updateTaskStatus('task_1', 'working');

  const completed = await manager.checkTaskCompletion('task_1');

  assert.strictEqual(completed, null);
});

test('TaskStateManager - check task completion returns null for non-existent task', async () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  const completed = await manager.checkTaskCompletion('nonexistent');

  assert.strictEqual(completed, null);
});

test('TaskStateManager - task history is maintained', () => {
  const store = new CheckpointStore();
  const manager = new TaskStateManager(store);

  const task = manager.createTask('task_1', 'context_1');
  manager.updateTaskStatus('task_1', 'working');
  manager.updateTaskStatus('task_1', 'completed');

  assert.ok(Array.isArray(task.history));
});
