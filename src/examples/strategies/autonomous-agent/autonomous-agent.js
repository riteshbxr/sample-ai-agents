import { createAIClient } from '../../../clients/client-factory.js';

/**
 * Autonomous Goal-Driven Agent
 * An agent that autonomously works toward a goal with minimal human intervention.
 *
 * Key Concepts:
 * - Goal Setting: Define high-level objectives
 * - Task Decomposition: Break goals into actionable tasks
 * - Autonomous Execution: Execute tasks independently
 * - Progress Monitoring: Track progress toward goals
 * - Adaptive Behavior: Adjust approach based on feedback
 *
 * Based on:
 * - AutoGPT / BabyAGI patterns
 * - Goal-Oriented Action Planning (GOAP)
 * - Belief-Desire-Intention (BDI) architecture
 */

/**
 * Goal representation
 */
class Goal {
  constructor(description, priority = 1) {
    this.id = `goal_${Date.now()}`;
    this.description = description;
    this.priority = priority;
    this.status = 'pending'; // pending, in_progress, completed, failed
    this.subgoals = [];
    this.progress = 0;
    this.createdAt = new Date().toISOString();
    this.completedAt = null;
  }

  addSubgoal(description) {
    const subgoal = new Goal(description, this.priority);
    subgoal.parentId = this.id;
    this.subgoals.push(subgoal);
    return subgoal;
  }

  updateProgress() {
    if (this.subgoals.length === 0) return;
    const completed = this.subgoals.filter((g) => g.status === 'completed').length;
    this.progress = (completed / this.subgoals.length) * 100;
  }
}

/**
 * Task representation
 */
class Task {
  constructor(description, goalId) {
    this.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.description = description;
    this.goalId = goalId;
    this.status = 'pending'; // pending, running, completed, failed
    this.result = null;
    this.error = null;
    this.attempts = 0;
    this.maxAttempts = 3;
  }
}

/**
 * Memory system for the autonomous agent
 */
class AgentMemory {
  constructor() {
    this.shortTerm = []; // Recent actions and results
    this.longTerm = new Map(); // Key facts and learned information
    this.workingMemory = {}; // Current context
    this.maxShortTermSize = 20;
  }

  addShortTerm(item) {
    this.shortTerm.push({
      ...item,
      timestamp: new Date().toISOString(),
    });

    // Keep short-term memory bounded
    if (this.shortTerm.length > this.maxShortTermSize) {
      this.shortTerm.shift();
    }
  }

  setLongTerm(key, value) {
    this.longTerm.set(key, {
      value,
      timestamp: new Date().toISOString(),
    });
  }

  getLongTerm(key) {
    return this.longTerm.get(key)?.value;
  }

  getContext() {
    return {
      recentActions: this.shortTerm.slice(-5),
      facts: Object.fromEntries(this.longTerm),
      working: this.workingMemory,
    };
  }

  summarize() {
    return {
      shortTermItems: this.shortTerm.length,
      longTermFacts: this.longTerm.size,
      lastAction: this.shortTerm[this.shortTerm.length - 1] || null,
    };
  }
}

/**
 * Autonomous Agent
 */
export class AutonomousAgent {
  /**
   * Create an autonomous agent
   * @param {string} provider - AI provider
   * @param {Object} options - Configuration
   */
  constructor(provider = 'openai', options = {}) {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.verbose = options.verbose !== false;

    // Core components
    this.goals = new Map();
    this.taskQueue = [];
    this.memory = new AgentMemory();
    this.tools = new Map();

    // Configuration
    this.maxIterations = options.maxIterations || 20;
    this.thinkingBudget = options.thinkingBudget || 5; // Max thinking steps per iteration
    this.autonomyLevel = options.autonomyLevel || 'high'; // low, medium, high

    // State
    this.isRunning = false;
    this.iterationCount = 0;
    this.actionHistory = [];
  }

  /**
   * Register a tool the agent can use
   */
  registerTool(name, description, execute) {
    this.tools.set(name, { name, description, execute });
  }

  /**
   * Set the main goal
   */
  setGoal(description, priority = 1) {
    const goal = new Goal(description, priority);
    this.goals.set(goal.id, goal);
    this.memory.workingMemory.mainGoal = goal.id;

    if (this.verbose) {
      console.log(`\n🎯 Goal set: "${description}"`);
    }

    return goal;
  }

  /**
   * Think about the current situation and decide what to do
   */
  async think() {
    const context = this.memory.getContext();
    const activeGoal = this.goals.get(this.memory.workingMemory.mainGoal);

    const thinkPrompt = `You are an autonomous agent working toward a goal.

CURRENT GOAL: ${activeGoal?.description || 'No goal set'}
PROGRESS: ${activeGoal?.progress || 0}%

AVAILABLE TOOLS:
${
  Array.from(this.tools.values())
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n') || 'No tools available'
}

RECENT ACTIONS:
${context.recentActions.map((a) => `- ${a.action}: ${a.result?.substring(0, 50)}...`).join('\n') || 'None yet'}

CURRENT TASK QUEUE: ${this.taskQueue.length} tasks pending

Think about:
1. What progress has been made?
2. What should be done next?
3. Is the goal achievable with current approach?
4. Should the strategy be adjusted?

Respond with JSON:
{
  "assessment": "current situation assessment",
  "nextAction": {
    "type": "think" | "use_tool" | "create_task" | "complete_goal" | "adjust_strategy",
    "tool": "tool_name (if using tool)",
    "input": "input for tool or task description",
    "reasoning": "why this action"
  },
  "confidence": 0.0-1.0,
  "shouldContinue": true/false
}`;

    const messages = [
      {
        role: 'system',
        content: 'You are an autonomous agent. Think strategically. Respond with JSON only.',
      },
      { role: 'user', content: thinkPrompt },
    ];

    const chatOptions = { temperature: 0.5 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);

    try {
      return JSON.parse(this.client.getTextContent(response));
    } catch {
      return {
        assessment: 'Unable to think clearly',
        nextAction: { type: 'think', reasoning: 'Need to reassess' },
        confidence: 0.3,
        shouldContinue: true,
      };
    }
  }

  /**
   * Execute an action
   */
  async act(action) {
    const startTime = Date.now();
    let result;

    switch (action.type) {
      case 'use_tool':
        if (this.tools.has(action.tool)) {
          const tool = this.tools.get(action.tool);
          if (this.verbose) {
            console.log(`   🔧 Using tool: ${action.tool}`);
          }
          result = await tool.execute(action.input);
        } else {
          result = `Tool ${action.tool} not found`;
        }
        break;

      case 'create_task': {
        const task = new Task(action.input, this.memory.workingMemory.mainGoal);
        this.taskQueue.push(task);
        result = `Task created: ${task.id}`;
        if (this.verbose) {
          console.log(`   📝 Created task: "${action.input}"`);
        }
        break;
      }

      case 'complete_goal': {
        const goal = this.goals.get(this.memory.workingMemory.mainGoal);
        if (goal) {
          goal.status = 'completed';
          goal.completedAt = new Date().toISOString();
        }
        result = 'Goal marked as completed';
        break;
      }

      case 'adjust_strategy':
        this.memory.setLongTerm('strategyAdjustment', action.input);
        result = `Strategy adjusted: ${action.input}`;
        if (this.verbose) {
          console.log(`   🔄 Strategy adjusted: ${action.input}`);
        }
        break;

      case 'think':
      default:
        result = 'Thinking completed';
        break;
    }

    // Record action in memory
    this.memory.addShortTerm({
      action: action.type,
      input: action.input,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      duration: Date.now() - startTime,
    });

    this.actionHistory.push({
      iteration: this.iterationCount,
      action,
      result,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Process pending tasks
   */
  async processTask() {
    if (this.taskQueue.length === 0) return null;

    const task = this.taskQueue.shift();
    task.status = 'running';
    task.attempts++;

    if (this.verbose) {
      console.log(`   ⚡ Processing task: "${task.description.substring(0, 50)}..."`);
    }

    try {
      // Use AI to execute the task
      const messages = [
        { role: 'system', content: 'Execute this task and provide the result.' },
        { role: 'user', content: task.description },
      ];

      const response = await this.client.chat(messages, { temperature: 0.5 });
      task.result = this.client.getTextContent(response);
      task.status = 'completed';

      this.memory.addShortTerm({
        action: 'task_completed',
        input: task.description,
        result: task.result.substring(0, 200),
      });

      return task;
    } catch (error) {
      task.error = error.message;
      if (task.attempts < task.maxAttempts) {
        this.taskQueue.push(task); // Retry later
        task.status = 'pending';
      } else {
        task.status = 'failed';
      }
      return task;
    }
  }

  /**
   * Check if the goal is achieved
   */
  async evaluateGoal() {
    const goal = this.goals.get(this.memory.workingMemory.mainGoal);
    if (!goal) return { achieved: false, reason: 'No goal set' };

    const evalPrompt = `Evaluate if this goal has been achieved.

GOAL: ${goal.description}

ACTIONS TAKEN:
${this.actionHistory
  .slice(-10)
  .map((a) => `- ${a.action.type}: ${a.result?.substring(0, 100)}`)
  .join('\n')}

MEMORY SUMMARY:
${JSON.stringify(this.memory.summarize())}

Respond with JSON: { "achieved": true/false, "progress": 0-100, "reasoning": "...", "remainingWork": [...] }`;

    const messages = [
      { role: 'system', content: 'Evaluate goal achievement. Respond with JSON only.' },
      { role: 'user', content: evalPrompt },
    ];

    const chatOptions = { temperature: 0.2 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);

    try {
      const evaluation = JSON.parse(this.client.getTextContent(response));
      goal.progress = evaluation.progress || 0;
      return evaluation;
    } catch {
      return { achieved: false, progress: 0, reasoning: 'Unable to evaluate' };
    }
  }

  /**
   * Run the autonomous agent loop
   */
  async run(goalDescription) {
    if (this.verbose) {
      console.log('\n🤖 Starting Autonomous Agent');
      console.log('='.repeat(60));
    }

    // Set the goal
    this.setGoal(goalDescription);
    this.isRunning = true;
    this.iterationCount = 0;

    // Main autonomous loop
    while (this.isRunning && this.iterationCount < this.maxIterations) {
      this.iterationCount++;

      if (this.verbose) {
        console.log(`\n--- Iteration ${this.iterationCount}/${this.maxIterations} ---`);
      }

      // Think about what to do
      const thought = await this.think();

      if (this.verbose) {
        console.log(`\n💭 Assessment: ${thought.assessment?.substring(0, 100)}...`);
        console.log(`   Confidence: ${(thought.confidence * 100).toFixed(0)}%`);
        console.log(`   Next action: ${thought.nextAction?.type}`);
      }

      // Check if we should stop
      if (!thought.shouldContinue) {
        if (this.verbose) {
          console.log('\n⏹️  Agent decided to stop');
        }
        break;
      }

      // Execute the decided action
      if (thought.nextAction) {
        await this.act(thought.nextAction);
      }

      // Process any pending tasks
      if (this.taskQueue.length > 0) {
        await this.processTask();
      }

      // Evaluate goal progress periodically
      if (this.iterationCount % 3 === 0) {
        const evaluation = await this.evaluateGoal();

        if (this.verbose) {
          console.log(`\n📊 Goal progress: ${evaluation.progress}%`);
        }

        if (evaluation.achieved) {
          if (this.verbose) {
            console.log('\n🎉 Goal achieved!');
          }
          break;
        }
      }
    }

    this.isRunning = false;

    // Final evaluation
    const finalEval = await this.evaluateGoal();

    return {
      goal: goalDescription,
      achieved: finalEval.achieved,
      progress: finalEval.progress,
      iterations: this.iterationCount,
      actionsExecuted: this.actionHistory.length,
      tasksCompleted: this.actionHistory.filter((a) => a.action.type === 'task_completed').length,
      memorySummary: this.memory.summarize(),
      actionHistory: this.actionHistory,
    };
  }

  /**
   * Stop the agent
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Get agent status
   */
  getStatus() {
    const goal = this.goals.get(this.memory.workingMemory.mainGoal);
    return {
      isRunning: this.isRunning,
      currentGoal: goal?.description,
      goalProgress: goal?.progress || 0,
      iterationCount: this.iterationCount,
      taskQueueSize: this.taskQueue.length,
      actionsExecuted: this.actionHistory.length,
    };
  }
}

/**
 * Create an autonomous agent with common tools
 */
export function createAutonomousAgent(provider = 'openai', options = {}) {
  const agent = new AutonomousAgent(provider, options);

  // Register common tools
  agent.registerTool('search', 'Search for information', async (query) => {
    // Mock search
    return `Search results for "${query}": Found relevant information about the topic.`;
  });

  agent.registerTool('calculate', 'Perform calculations', async (expression) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return `Calculation result: ${result}`;
    } catch {
      return 'Calculation error';
    }
  });

  agent.registerTool('writeNote', 'Save a note to memory', async (note) => {
    agent.memory.setLongTerm(`note_${Date.now()}`, note);
    return 'Note saved';
  });

  agent.registerTool('readNotes', 'Read all saved notes', async () => {
    const notes = Array.from(agent.memory.longTerm.entries())
      .filter(([k]) => k.startsWith('note_'))
      .map(([k, v]) => `${k}: ${v.value}`);
    return notes.length > 0 ? notes.join('\n') : 'No notes found';
  });

  return agent;
}
