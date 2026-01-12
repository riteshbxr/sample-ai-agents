import { createAIClient } from '../clients/client-factory.js';

/**
 * Checkpoint Store
 * In-memory checkpoint storage (can be extended to use Postgres)
 */
export class CheckpointStore {
  constructor() {
    this.checkpoints = new Map(); // threadId -> checkpoints array
  }

  /**
   * Save a checkpoint
   * @param {string} threadId - Thread ID
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Promise<Object>} Saved checkpoint
   */
  async save(threadId, checkpoint) {
    if (!this.checkpoints.has(threadId)) {
      this.checkpoints.set(threadId, []);
    }

    const checkpoints = this.checkpoints.get(threadId);
    checkpoint.timestamp = new Date().toISOString();
    checkpoint.id = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    checkpoints.push(checkpoint);

    return checkpoint;
  }

  /**
   * Get the latest checkpoint for a thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object|null>} Latest checkpoint or null
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
   * @param {string} threadId - Thread ID
   * @returns {Promise<Array>} Array of checkpoints
   */
  async getAll(threadId) {
    return this.checkpoints.get(threadId) || [];
  }

  /**
   * Clear checkpoints for a thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<void>}
   */
  async clear(threadId) {
    this.checkpoints.delete(threadId);
  }
}

/**
 * Stateful Agent with Checkpointing
 * Manages stateful workflows with checkpoint support
 */
export class StatefulAgent {
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
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Saved checkpoint
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
   * @param {string} threadId - Thread ID
   * @returns {Promise<boolean>} True if restored, false otherwise
   */
  async restore(threadId) {
    const checkpoint = await this.checkpointStore.getLatest(threadId);
    if (checkpoint && checkpoint.state) {
      this.state = JSON.parse(JSON.stringify(checkpoint.state)); // Deep copy to prevent mutation
      return true;
    }
    return false;
  }

  /**
   * Execute a multi-step workflow with checkpointing
   * @param {string} threadId - Thread ID
   * @param {Array} steps - Array of step objects with {name, description, execute}
   * @returns {Promise<Object>} Final state
   */
  async executeWorkflow(threadId, steps) {
    // Try to restore from checkpoint
    await this.restore(threadId);

    // Execute remaining steps
    for (let i = this.state.step; i < steps.length; i++) {
      const step = steps[i];

      // Execute step
      const result = await step.execute(this.state);

      // Update state
      this.state.step = i + 1;
      this.state.completed.push(step.name);
      this.state.results[step.name] = result;
      this.state.currentTask = step.name;

      // Save checkpoint after each step
      await this.checkpoint(threadId);

      // Simulate potential interruption (for demo purposes)
      if (step.simulateInterruption) {
        throw new Error('Workflow interrupted');
      }
    }

    return this.state;
  }
}

/**
 * Task State Manager
 * Manages task lifecycle with checkpointing
 */
export class TaskStateManager {
  constructor(checkpointStore) {
    this.checkpointStore = checkpointStore;
    this.tasks = new Map(); // taskId -> task
  }

  /**
   * Create a new task
   * @param {string} taskId - Task ID
   * @param {string} contextId - Context ID
   * @param {Object} metadata - Task metadata
   * @returns {Object} Created task
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
   * @param {string} taskId - Task ID
   * @param {string} state - New state
   * @param {string|null} message - Optional message
   * @returns {Object} Updated task
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
   * @param {string} taskId - Task ID
   * @returns {Object|null} Task or null
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Check if task is completed
   * @param {string} taskId - Task ID
   * @returns {Promise<Object|null>} Completed task or null
   */
  async checkTaskCompletion(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    // Simulate checking if task is complete
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
