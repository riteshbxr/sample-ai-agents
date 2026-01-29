import { createAIClient } from '../../../clients/client-factory.js';

/**
 * Supervisor Agent Pattern
 * A hierarchical multi-agent system where a supervisor delegates to specialized workers.
 *
 * Key Concepts:
 * - Supervisor: High-level agent that routes tasks to appropriate workers
 * - Workers: Specialized agents that handle specific types of tasks
 * - Routing: Intelligent task delegation based on task requirements
 * - Aggregation: Combining results from multiple workers
 *
 * Based on:
 * - LangGraph Supervisor pattern
 * - Multi-Agent Conversation patterns
 * - Hierarchical Task Networks (HTN)
 */

/**
 * Worker Agent - Specialized agent for specific tasks
 */
export class WorkerAgent {
  /**
   * Create a worker agent
   * @param {string} name - Worker name/identifier
   * @param {string} role - Worker's role description
   * @param {string} specialty - What this worker specializes in
   * @param {string} provider - AI provider
   */
  constructor(name, role, specialty, provider = 'openai') {
    this.name = name;
    this.role = role;
    this.specialty = specialty;
    this.provider = provider;
    this.client = createAIClient(provider);
    this.taskHistory = [];
  }

  /**
   * Get the worker's system prompt
   */
  getSystemPrompt() {
    return `You are ${this.name}, a specialized AI assistant.
Role: ${this.role}
Specialty: ${this.specialty}

Your job is to handle tasks related to your specialty with high quality and expertise.
Be thorough, accurate, and provide actionable results.`;
  }

  /**
   * Execute a task
   * @param {string} task - The task to execute
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Task result
   */
  async execute(task, context = {}) {
    const startTime = Date.now();

    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Task: ${task}
${context.additionalInfo ? `\nAdditional context: ${context.additionalInfo}` : ''}
${context.previousResults ? `\nPrevious results from other workers: ${JSON.stringify(context.previousResults)}` : ''}`,
      },
    ];

    const response = await this.client.chat(messages, { temperature: 0.5 });
    const result = this.client.getTextContent(response);

    const taskRecord = {
      task,
      result,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    this.taskHistory.push(taskRecord);

    return {
      worker: this.name,
      specialty: this.specialty,
      result,
      duration: taskRecord.duration,
    };
  }

  /**
   * Get worker capabilities description
   */
  getCapabilities() {
    return {
      name: this.name,
      role: this.role,
      specialty: this.specialty,
      tasksCompleted: this.taskHistory.length,
    };
  }
}

/**
 * Supervisor Agent - Routes tasks to appropriate workers
 */
export class SupervisorAgent {
  /**
   * Create a supervisor agent
   * @param {string} provider - AI provider
   * @param {Object} options - Configuration options
   */
  constructor(provider = 'openai', options = {}) {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.workers = new Map();
    this.verbose = options.verbose !== false;
    this.routingHistory = [];
    this.maxDelegations = options.maxDelegations || 5;
  }

  /**
   * Register a worker agent
   * @param {WorkerAgent} worker - The worker to register
   */
  registerWorker(worker) {
    this.workers.set(worker.name, worker);
    if (this.verbose) {
      console.log(`📝 Registered worker: ${worker.name} (${worker.specialty})`);
    }
  }

  /**
   * Get all workers' capabilities
   */
  getWorkersDescription() {
    return Array.from(this.workers.values())
      .map((w) => `- ${w.name}: ${w.role}\n  Specialty: ${w.specialty}`)
      .join('\n\n');
  }

  /**
   * Route a task to the appropriate worker(s)
   * @param {string} task - The task to route
   * @returns {Promise<Object>} Routing decision
   */
  async route(task) {
    if (this.verbose) {
      console.log(`\n🎯 Routing task: "${task.substring(0, 60)}..."`);
    }

    const routingPrompt = `You are a task routing supervisor. Analyze the task and decide which worker(s) should handle it.

TASK: ${task}

AVAILABLE WORKERS:
${this.getWorkersDescription()}

Decide:
1. Which worker(s) are best suited for this task
2. Whether multiple workers should collaborate (parallel or sequential)
3. What specific instructions each worker should receive

IMPORTANT: Respond with valid JSON only:
{
  "analysis": "brief analysis of the task",
  "workers": [
    {
      "name": "worker_name",
      "reason": "why this worker",
      "instructions": "specific instructions for this worker"
    }
  ],
  "executionMode": "parallel" | "sequential" | "single",
  "aggregationNeeded": true | false
}`;

    const messages = [
      {
        role: 'system',
        content:
          'You are a task routing supervisor. Route tasks to appropriate workers. Respond with JSON only.',
      },
      { role: 'user', content: routingPrompt },
    ];

    const chatOptions = { temperature: 0.3 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);
    const routingText = this.client.getTextContent(response);

    try {
      const routing = JSON.parse(routingText);
      this.routingHistory.push({
        task,
        routing,
        timestamp: new Date().toISOString(),
      });

      if (this.verbose) {
        console.log(`   Execution mode: ${routing.executionMode}`);
        console.log(`   Workers assigned: ${routing.workers?.map((w) => w.name).join(', ')}`);
      }

      return routing;
    } catch {
      throw new Error('Failed to parse routing decision');
    }
  }

  /**
   * Execute a task by delegating to workers
   * @param {string} task - The main task
   * @returns {Promise<Object>} Aggregated results
   */
  async delegate(task) {
    if (this.verbose) {
      console.log('\n👔 Supervisor: Delegating task');
      console.log('='.repeat(60));
    }

    // Route the task
    const routing = await this.route(task);

    if (!routing.workers || routing.workers.length === 0) {
      // Handle task directly if no workers assigned
      return this.handleDirectly(task);
    }

    const results = [];

    // Execute based on mode
    if (routing.executionMode === 'parallel') {
      // Execute all workers in parallel
      if (this.verbose) {
        console.log('\n⚡ Executing in parallel...');
      }

      const promises = routing.workers.map(async (workerSpec) => {
        const worker = this.workers.get(workerSpec.name);
        if (!worker) {
          return {
            worker: workerSpec.name,
            error: 'Worker not found',
          };
        }

        return worker.execute(workerSpec.instructions, { task });
      });

      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      // Execute workers sequentially
      if (this.verbose) {
        console.log('\n🔄 Executing sequentially...');
      }

      const previousResults = [];
      for (const workerSpec of routing.workers) {
        const worker = this.workers.get(workerSpec.name);
        if (!worker) {
          results.push({ worker: workerSpec.name, error: 'Worker not found' });
          continue;
        }

        if (this.verbose) {
          console.log(`\n   🔧 Delegating to ${worker.name}...`);
        }

        const result = await worker.execute(workerSpec.instructions, {
          task,
          previousResults,
        });

        results.push(result);
        previousResults.push(result);
      }
    }

    // Aggregate results if needed
    let finalResult;
    if (routing.aggregationNeeded && results.length > 1) {
      finalResult = await this.aggregate(task, results);
    } else {
      finalResult = results;
    }

    return {
      task,
      routing,
      workerResults: results,
      finalResult,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle a task directly without delegation
   */
  async handleDirectly(task) {
    if (this.verbose) {
      console.log('\n📋 Supervisor handling task directly...');
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful assistant. Handle this task since no specialized workers are available.',
      },
      { role: 'user', content: task },
    ];

    const response = await this.client.chat(messages, { temperature: 0.5 });
    return {
      task,
      handledBy: 'supervisor',
      result: this.client.getTextContent(response),
    };
  }

  /**
   * Aggregate results from multiple workers
   */
  async aggregate(task, results) {
    if (this.verbose) {
      console.log('\n📊 Aggregating results from workers...');
    }

    const aggregatePrompt = `Synthesize the results from multiple workers into a cohesive final response.

ORIGINAL TASK: ${task}

WORKER RESULTS:
${results.map((r) => `\n${r.worker} (${r.specialty}):\n${r.result}`).join('\n\n---')}

Create a comprehensive response that:
1. Combines the best insights from each worker
2. Resolves any conflicts or contradictions
3. Provides a unified, coherent answer`;

    const messages = [
      {
        role: 'system',
        content: 'You are a supervisor synthesizing results from multiple specialized workers.',
      },
      { role: 'user', content: aggregatePrompt },
    ];

    const response = await this.client.chat(messages, { temperature: 0.4 });
    return {
      aggregated: true,
      result: this.client.getTextContent(response),
      sourceWorkers: results.map((r) => r.worker),
    };
  }

  /**
   * Interactive session with the supervisor
   */
  async session(tasks) {
    if (this.verbose) {
      console.log('\n🎭 Starting Supervisor Session');
      console.log(`   Workers available: ${this.workers.size}`);
      console.log(`   Tasks to process: ${tasks.length}`);
    }

    const sessionResults = [];

    for (let i = 0; i < tasks.length; i++) {
      if (this.verbose) {
        console.log(`\n\n📌 Task ${i + 1}/${tasks.length}`);
        console.log('─'.repeat(60));
      }

      const result = await this.delegate(tasks[i]);
      sessionResults.push(result);
    }

    return {
      totalTasks: tasks.length,
      completedTasks: sessionResults.length,
      results: sessionResults,
      routingHistory: this.routingHistory,
    };
  }

  /**
   * Get supervisor statistics
   */
  getStats() {
    const workerStats = Array.from(this.workers.values()).map((w) => ({
      name: w.name,
      tasksCompleted: w.taskHistory.length,
      averageDuration: w.taskHistory.length
        ? w.taskHistory.reduce((sum, t) => sum + t.duration, 0) / w.taskHistory.length
        : 0,
    }));

    return {
      totalWorkers: this.workers.size,
      totalRoutings: this.routingHistory.length,
      workerStats,
    };
  }
}

/**
 * Create pre-configured supervisor with common worker types
 */
export function createDefaultSupervisor(provider = 'openai', options = {}) {
  const supervisor = new SupervisorAgent(provider, options);

  // Register common workers
  supervisor.registerWorker(
    new WorkerAgent(
      'ResearchWorker',
      'Research and information gathering specialist',
      'Finding, analyzing, and summarizing information from various sources',
      provider
    )
  );

  supervisor.registerWorker(
    new WorkerAgent(
      'WritingWorker',
      'Content creation and writing specialist',
      'Creating well-written content, articles, documentation, and creative writing',
      provider
    )
  );

  supervisor.registerWorker(
    new WorkerAgent(
      'AnalysisWorker',
      'Data analysis and reasoning specialist',
      'Analyzing data, identifying patterns, and providing insights',
      provider
    )
  );

  supervisor.registerWorker(
    new WorkerAgent(
      'CodeWorker',
      'Programming and technical specialist',
      'Writing, reviewing, and debugging code across various languages',
      provider
    )
  );

  supervisor.registerWorker(
    new WorkerAgent(
      'ReviewWorker',
      'Quality assurance and review specialist',
      'Reviewing content for quality, accuracy, and completeness',
      provider
    )
  );

  return supervisor;
}
