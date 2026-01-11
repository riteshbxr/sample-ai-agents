import { createAIClient } from '../../../clients/client-factory.js';

/**
 * State Persistence / Checkpointing Example
 * Demonstrates the state management pattern used in galactiq
 *
 * In galactiq, PostgresSaver is used for checkpointing agent state.
 * This allows:
 * - Resuming interrupted workflows
 * - State recovery after failures
 * - Long-running task management
 * - Multi-step workflow persistence
 *
 * This example simulates checkpointing using in-memory storage (can be extended to use Postgres)
 */

/**
 * Simple Checkpoint Store (In-Memory)
 * In production (galactiq), this uses PostgresSaver from @langchain/langgraph-checkpoint-postgres
 */
class CheckpointStore {
  constructor() {
    this.checkpoints = new Map(); // threadId -> checkpoints array
  }

  /**
   * Save a checkpoint
   */
  async save(threadId, checkpoint) {
    if (!this.checkpoints.has(threadId)) {
      this.checkpoints.set(threadId, []);
    }

    const checkpoints = this.checkpoints.get(threadId);
    checkpoint.timestamp = new Date().toISOString();
    checkpoint.id = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    checkpoints.push(checkpoint);

    console.log(`  💾 [Checkpoint] Saved checkpoint for thread ${threadId}`);
    return checkpoint;
  }

  /**
   * Get the latest checkpoint for a thread
   */
  async getLatest(threadId) {
    const checkpoints = this.checkpoints.get(threadId);
    if (!checkpoints || checkpoints.length === 0) {
      return null;
    }
    return checkpoints[checkpoints.length - 1];
  }

  /**
   * Get all checkpoints for a thread
   */
  async getAll(threadId) {
    return this.checkpoints.get(threadId) || [];
  }

  /**
   * Clear checkpoints for a thread
   */
  async clear(threadId) {
    this.checkpoints.delete(threadId);
    console.log(`  🗑️  [Checkpoint] Cleared checkpoints for thread ${threadId}`);
  }
}

/**
 * Stateful Agent with Checkpointing
 * Simulates the pattern used in galactiq's AgentExecutors
 */
class StatefulAgent {
  constructor(provider = 'openai', checkpointStore) {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.checkpointStore = checkpointStore;
    this.state = {
      step: 0,
      completed: [],
      currentTask: null,
      results: {},
      metadata: {},
    };
  }

  /**
   * Save current state as checkpoint
   */
  async checkpoint(threadId) {
    const checkpoint = {
      threadId,
      state: JSON.parse(JSON.stringify(this.state)), // Deep copy
      timestamp: new Date().toISOString(),
    };
    await this.checkpointStore.save(threadId, checkpoint);
    return checkpoint;
  }

  /**
   * Restore state from checkpoint
   */
  async restore(threadId) {
    const checkpoint = await this.checkpointStore.getLatest(threadId);
    if (checkpoint && checkpoint.state) {
      this.state = checkpoint.state;
      console.log(`  ♻️  [State] Restored state from checkpoint`);
      console.log(`     Step: ${this.state.step}, Completed: ${this.state.completed.length}`);
      return true;
    }
    return false;
  }

  /**
   * Execute a multi-step workflow with checkpointing
   */
  async executeWorkflow(threadId, steps) {
    console.log(`\n🔄 [Workflow] Starting workflow for thread ${threadId}`);
    console.log(`   Steps: ${steps.length}\n`);

    // Try to restore from checkpoint
    const restored = await this.restore(threadId);
    if (restored) {
      console.log(`  ✅ [Workflow] Resumed from checkpoint at step ${this.state.step}\n`);
    }

    // Execute remaining steps
    for (let i = this.state.step; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\n📋 [Step ${i + 1}/${steps.length}] ${step.name}`);
      console.log(`   Description: ${step.description}`);

      try {
        // Execute step
        const result = await step.execute(this.state);

        // Update state
        this.state.step = i + 1;
        this.state.completed.push(step.name);
        this.state.results[step.name] = result;
        this.state.currentTask = step.name;

        console.log(`  ✅ [Step ${i + 1}] Completed: ${step.name}`);

        // Save checkpoint after each step
        await this.checkpoint(threadId);

        // Simulate potential interruption (for demo purposes)
        if (step.simulateInterruption) {
          console.log(`\n  ⚠️  [Interruption] Simulating workflow interruption...`);
          throw new Error('Workflow interrupted');
        }
      } catch (error) {
        console.log(`  ❌ [Step ${i + 1}] Error: ${error.message}`);
        // State is already saved, can resume later
        throw error;
      }
    }

    console.log(`\n✅ [Workflow] All steps completed!`);
    return this.state;
  }
}

/**
 * Example workflow steps
 */
function createWorkflowSteps() {
  return [
    {
      name: 'research',
      description: 'Research the topic',
      execute: async () => {
        console.log(`     Executing research...`);
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate work
        return { findings: 'Research findings: Topic is well-documented' };
      },
    },
    {
      name: 'analyze',
      description: 'Analyze the research findings',
      execute: async (state) => {
        console.log(`     Analyzing research...`);
        const research = state.results.research;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { analysis: `Analysis of: ${research.findings}` };
      },
    },
    {
      name: 'generate',
      description: 'Generate output based on analysis',
      execute: async (state) => {
        console.log(`     Generating output...`);
        const analysis = state.results.analyze;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { output: `Generated output from: ${analysis.analysis}` };
      },
    },
    {
      name: 'validate',
      description: 'Validate the generated output',
      execute: async (state) => {
        console.log(`     Validating output...`);
        const generated = state.results.generate;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { validated: true, output: generated.output };
      },
    },
  ];
}

/**
 * Task State Manager
 * Simulates the A2A task state management from galactiq
 */
class TaskStateManager {
  constructor(checkpointStore) {
    this.checkpointStore = checkpointStore;
    this.tasks = new Map(); // taskId -> task
  }

  /**
   * Create a new task
   */
  createTask(taskId, contextId, metadata = {}) {
    const task = {
      id: taskId,
      contextId,
      status: {
        state: 'submitted',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        ...metadata,
        ttl: Date.now() + 15 * 60 * 1000, // 15 minutes TTL
      },
      history: [],
    };
    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId, state, message = null) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = {
      state,
      timestamp: new Date().toISOString(),
      message,
    };

    // Save checkpoint
    this.checkpointStore.save(task.contextId, {
      taskId,
      status: task.status,
      metadata: task.metadata,
    });

    return task;
  }

  /**
   * Get task
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Check if task is completed (simulating galactiq's checkIfTaskIsCompleted)
   */
  async checkTaskCompletion(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    // Simulate checking if task is complete
    // In galactiq, this checks the actual service state
    if (task.status.state === 'working') {
      // Simulate completion check
      const checkpoint = await this.checkpointStore.getLatest(task.contextId);
      if (checkpoint && checkpoint.completed) {
        this.updateTaskStatus(taskId, 'input-required', 'Task completed successfully');
        return task;
      }
    }

    return null;
  }
}

/**
 * Main example function
 */
async function statePersistenceExample() {
  console.log('=== State Persistence / Checkpointing Example ===');
  console.log('State management pattern from galactiq\n');

  const provider =
    process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  const checkpointStore = new CheckpointStore();

  try {
    // Example 1: Multi-step workflow with checkpointing
    console.log('📝 Example 1: Multi-Step Workflow with Checkpointing');
    console.log('='.repeat(60));

    const agent = new StatefulAgent(provider, checkpointStore);
    const threadId = 'thread_001';
    const steps = createWorkflowSteps();

    // Execute workflow
    const result1 = await agent.executeWorkflow(threadId, steps);
    console.log(`\n📤 Final State:`, JSON.stringify(result1, null, 2));

    // Example 2: Resume from checkpoint after interruption
    console.log('\n\n📝 Example 2: Resume from Checkpoint');
    console.log('='.repeat(60));

    const agent2 = new StatefulAgent(provider, checkpointStore);
    const threadId2 = 'thread_002';
    const steps2 = createWorkflowSteps();

    // Make second step simulate interruption
    steps2[1].simulateInterruption = true;

    try {
      await agent2.executeWorkflow(threadId2, steps2);
    } catch (error) {
      console.log(`\n  ⏸️  [Resume] Workflow interrupted, state saved`);
    }

    // Resume workflow
    console.log(`\n  🔄 [Resume] Resuming workflow...`);
    const agent3 = new StatefulAgent(provider, checkpointStore);
    const steps3 = createWorkflowSteps(); // No interruption this time
    const result2 = await agent3.executeWorkflow(threadId2, steps3);
    console.log(`\n📤 Final State:`, JSON.stringify(result2, null, 2));

    // Example 3: Task state management (A2A pattern)
    console.log('\n\n📝 Example 3: Task State Management (A2A Pattern)');
    console.log('='.repeat(60));

    const taskManager = new TaskStateManager(checkpointStore);
    const taskId = 'task_001';
    const contextId = 'context_001';

    // Create task
    const task = taskManager.createTask(taskId, contextId, {
      agentName: 'template_generator',
      userId: 'user_123',
    });
    console.log(`\n  ✅ [Task] Created: ${task.id}, Status: ${task.status.state}`);

    // Update to working
    taskManager.updateTaskStatus(taskId, 'working');
    console.log(`  🔄 [Task] Updated to: working`);

    // Simulate completion check
    const checkpoint = await checkpointStore.getLatest(contextId);
    checkpoint.completed = true;
    await checkpointStore.save(contextId, checkpoint);

    const completedTask = await taskManager.checkTaskCompletion(taskId);
    if (completedTask) {
      console.log(`  ✅ [Task] Completed: ${completedTask.status.state}`);
      console.log(`     Message: ${completedTask.status.message}`);
    }

    // Show checkpoint history
    console.log('\n\n📊 Checkpoint History');
    console.log('='.repeat(60));
    const allCheckpoints = await checkpointStore.getAll(threadId);
    console.log(`Thread ${threadId} has ${allCheckpoints.length} checkpoint(s)`);
    allCheckpoints.forEach((cp, i) => {
      console.log(`  ${i + 1}. ${cp.id} at ${cp.timestamp}`);
    });

    console.log('\n✅ All state persistence examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Checkpoint saving: Save state after each step');
    console.log('  - State restoration: Resume from saved checkpoints');
    console.log('  - Workflow recovery: Handle interruptions gracefully');
    console.log('  - Task state management: Track task lifecycle');
    console.log("  - Pattern matches galactiq's PostgresSaver implementation");
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
statePersistenceExample().catch(console.error);
