import { createAIClient } from '../../../clients/client-factory.js';

/**
 * Planning Agent
 * An agent that creates a structured plan before executing tasks.
 *
 * Key Concepts:
 * - Plan-and-Solve: Create a plan first, then execute step by step
 * - Dynamic Re-planning: Adjust the plan based on execution results
 * - Goal Decomposition: Break complex goals into manageable steps
 *
 * Based on:
 * - Plan-and-Solve Prompting (Wang et al., 2023)
 * - ReWOO: Reasoning WithOut Observation (Xu et al., 2023)
 * - DEPS: Describe, Explain, Plan, Select (Wang et al., 2023)
 */
export class PlanningAgent {
  /**
   * Create a planning agent
   * @param {string} provider - AI provider ('openai' or 'claude')
   * @param {Object} options - Configuration options
   */
  constructor(provider = 'openai', options = {}) {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.verbose = options.verbose !== false;
    this.maxSteps = options.maxSteps || 10;
    this.tools = new Map();
    this.currentPlan = null;
    this.executionHistory = [];
  }

  /**
   * Register a tool that the agent can use
   * @param {string} name - Tool name
   * @param {string} description - Tool description
   * @param {Function} execute - Tool execution function
   */
  registerTool(name, description, execute) {
    this.tools.set(name, { name, description, execute });
  }

  /**
   * Generate a plan for the given goal
   * @param {string} goal - The goal to achieve
   * @returns {Promise<Object>} The generated plan
   */
  async createPlan(goal) {
    if (this.verbose) {
      console.log('\n📋 Creating plan for goal:', goal);
    }

    const toolDescriptions = Array.from(this.tools.values())
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    const planPrompt = `You are a planning expert. Create a detailed step-by-step plan to achieve the given goal.

GOAL: ${goal}

AVAILABLE TOOLS:
${toolDescriptions || '- No tools available (use reasoning only)'}

Create a plan with the following structure:
1. Each step should be specific and actionable
2. Steps should be in logical order
3. Include which tool to use for each step (if applicable)
4. Include expected output for each step
5. Consider dependencies between steps

IMPORTANT: Respond with valid JSON only in this format:
{
  "goal": "the goal",
  "reasoning": "brief analysis of how to approach this",
  "steps": [
    {
      "id": 1,
      "description": "what to do",
      "tool": "tool_name or null",
      "input": "input for the tool or reasoning prompt",
      "expectedOutput": "what we expect to get",
      "dependsOn": []
    }
  ],
  "successCriteria": "how to know if the goal is achieved"
}`;

    const messages = [
      {
        role: 'system',
        content:
          'You are a planning expert. Create structured plans. Always respond with valid JSON only.',
      },
      { role: 'user', content: planPrompt },
    ];

    const chatOptions = { temperature: 0.3 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);
    const planText = this.client.getTextContent(response);

    try {
      this.currentPlan = JSON.parse(planText);
      this.currentPlan.status = 'created';
      this.currentPlan.createdAt = new Date().toISOString();

      if (this.verbose) {
        console.log(`\n✅ Plan created with ${this.currentPlan.steps?.length || 0} steps`);
        console.log(`   Reasoning: ${this.currentPlan.reasoning?.substring(0, 100)}...`);
      }

      return this.currentPlan;
    } catch {
      throw new Error(`Failed to parse plan: ${planText.substring(0, 200)}`);
    }
  }

  /**
   * Execute a single step of the plan
   * @param {Object} step - The step to execute
   * @returns {Promise<Object>} Step execution result
   */
  async executeStep(step) {
    if (this.verbose) {
      console.log(`\n⚡ Executing step ${step.id}: ${step.description}`);
    }

    const startTime = Date.now();
    let result;

    try {
      if (step.tool && this.tools.has(step.tool)) {
        // Execute tool
        const tool = this.tools.get(step.tool);
        if (this.verbose) {
          console.log(`   🔧 Using tool: ${step.tool}`);
        }
        result = await tool.execute(step.input);
      } else {
        // Use reasoning
        const reasoningPrompt = `Execute this step: ${step.description}

Context:
- Input: ${step.input}
- Expected Output: ${step.expectedOutput}
- Previous results: ${JSON.stringify(this.executionHistory.slice(-3).map((h) => ({ step: h.stepId, result: h.result?.substring(0, 100) })))}

Provide a detailed response that accomplishes this step.`;

        const messages = [
          {
            role: 'system',
            content: 'You are executing a planned step. Be thorough and precise.',
          },
          { role: 'user', content: reasoningPrompt },
        ];

        const response = await this.client.chat(messages, { temperature: 0.5 });
        result = this.client.getTextContent(response);
      }

      const executionResult = {
        stepId: step.id,
        status: 'completed',
        result,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      this.executionHistory.push(executionResult);

      if (this.verbose) {
        console.log(`   ✅ Step completed in ${executionResult.duration}ms`);
        console.log(`   Result: ${String(result).substring(0, 100)}...`);
      }

      return executionResult;
    } catch (error) {
      const executionResult = {
        stepId: step.id,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      this.executionHistory.push(executionResult);

      if (this.verbose) {
        console.log(`   ❌ Step failed: ${error.message}`);
      }

      return executionResult;
    }
  }

  /**
   * Re-plan based on execution results
   * @param {string} reason - Reason for re-planning
   * @returns {Promise<Object>} Updated plan
   */
  async replan(reason) {
    if (this.verbose) {
      console.log(`\n🔄 Re-planning: ${reason}`);
    }

    const replanPrompt = `The original plan needs adjustment.

ORIGINAL GOAL: ${this.currentPlan.goal}

ORIGINAL PLAN:
${JSON.stringify(this.currentPlan.steps, null, 2)}

EXECUTION HISTORY:
${JSON.stringify(this.executionHistory, null, 2)}

REASON FOR RE-PLANNING: ${reason}

Create an updated plan that:
1. Builds on successful steps
2. Addresses the issues encountered
3. Adjusts remaining steps as needed

Respond with the updated plan in the same JSON format.`;

    const messages = [
      {
        role: 'system',
        content: 'You are a planning expert. Adjust plans based on execution feedback.',
      },
      { role: 'user', content: replanPrompt },
    ];

    const chatOptions = { temperature: 0.3 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);
    const newPlan = JSON.parse(this.client.getTextContent(response));

    this.currentPlan = {
      ...newPlan,
      status: 'replanned',
      replanReason: reason,
      replanCount: (this.currentPlan.replanCount || 0) + 1,
    };

    return this.currentPlan;
  }

  /**
   * Execute the full plan
   * @param {string} goal - The goal to achieve
   * @returns {Promise<Object>} Execution results
   */
  async execute(goal) {
    if (this.verbose) {
      console.log('\n🎯 Starting Plan-and-Execute for goal:', goal);
      console.log('='.repeat(60));
    }

    // Create initial plan
    await this.createPlan(goal);

    if (!this.currentPlan?.steps?.length) {
      throw new Error('No steps in plan');
    }

    // Execute each step
    const completedSteps = new Set();
    let maxIterations = this.maxSteps * 2; // Allow for re-planning

    while (completedSteps.size < this.currentPlan.steps.length && maxIterations > 0) {
      maxIterations--;

      // Find next step to execute (respecting dependencies)
      const nextStep = this.currentPlan.steps.find(
        (step) =>
          !completedSteps.has(step.id) &&
          (step.dependsOn || []).every((dep) => completedSteps.has(dep))
      );

      if (!nextStep) {
        // Check if there are incomplete steps with unmet dependencies
        const incompleteSteps = this.currentPlan.steps.filter((s) => !completedSteps.has(s.id));
        if (incompleteSteps.length > 0) {
          await this.replan('Dependency deadlock detected');
          continue;
        }
        break;
      }

      const result = await this.executeStep(nextStep);

      if (result.status === 'completed') {
        completedSteps.add(nextStep.id);
      } else if (result.status === 'failed') {
        // Re-plan on failure
        await this.replan(`Step ${nextStep.id} failed: ${result.error}`);
      }
    }

    // Generate final summary
    const summary = await this.generateSummary();

    return {
      goal,
      plan: this.currentPlan,
      executionHistory: this.executionHistory,
      summary,
      success: completedSteps.size === this.currentPlan.steps.length,
    };
  }

  /**
   * Generate execution summary
   */
  async generateSummary() {
    const summaryPrompt = `Summarize the execution of this plan:

GOAL: ${this.currentPlan.goal}

EXECUTION HISTORY:
${this.executionHistory.map((h) => `Step ${h.stepId}: ${h.status} - ${String(h.result || h.error).substring(0, 100)}`).join('\n')}

Provide a brief summary including:
1. What was accomplished
2. Key results
3. Any issues encountered`;

    const messages = [
      { role: 'system', content: 'Summarize plan execution concisely.' },
      { role: 'user', content: summaryPrompt },
    ];

    const response = await this.client.chat(messages, { temperature: 0.3 });
    return this.client.getTextContent(response);
  }

  /**
   * Get current plan status
   */
  getPlanStatus() {
    if (!this.currentPlan) return null;

    const completedSteps = this.executionHistory.filter((h) => h.status === 'completed').length;
    const failedSteps = this.executionHistory.filter((h) => h.status === 'failed').length;

    return {
      goal: this.currentPlan.goal,
      totalSteps: this.currentPlan.steps?.length || 0,
      completedSteps,
      failedSteps,
      status: this.currentPlan.status,
      replanCount: this.currentPlan.replanCount || 0,
    };
  }
}

/**
 * Hierarchical Planning Agent
 * Creates plans with sub-plans for complex goals
 */
export class HierarchicalPlanningAgent extends PlanningAgent {
  /**
   * Create a hierarchical plan with sub-goals
   */
  async createHierarchicalPlan(goal) {
    if (this.verbose) {
      console.log('\n📋 Creating hierarchical plan for:', goal);
    }

    const planPrompt = `Create a hierarchical plan for this complex goal.

GOAL: ${goal}

First, decompose the goal into major sub-goals, then create detailed steps for each.

Respond with JSON:
{
  "goal": "main goal",
  "subGoals": [
    {
      "id": "sg1",
      "description": "sub-goal description",
      "steps": [
        {
          "id": 1,
          "description": "step description",
          "tool": null,
          "input": "...",
          "expectedOutput": "...",
          "dependsOn": []
        }
      ]
    }
  ],
  "dependencies": [
    { "from": "sg1", "to": "sg2" }
  ],
  "successCriteria": "..."
}`;

    const messages = [
      { role: 'system', content: 'Create hierarchical plans. Respond with JSON only.' },
      { role: 'user', content: planPrompt },
    ];

    const chatOptions = { temperature: 0.3 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);
    return JSON.parse(this.client.getTextContent(response));
  }
}

/**
 * Adaptive Planning Agent
 * Continuously adapts the plan based on environment feedback
 */
export class AdaptivePlanningAgent extends PlanningAgent {
  constructor(provider, options = {}) {
    super(provider, options);
    this.adaptationThreshold = options.adaptationThreshold || 0.3;
  }

  /**
   * Evaluate if adaptation is needed
   */
  async shouldAdapt(stepResult, context) {
    const evalPrompt = `Evaluate if the plan should be adapted based on this result.

STEP RESULT: ${JSON.stringify(stepResult)}
CONTEXT: ${JSON.stringify(context)}
EXPECTED OUTPUT: ${context.expectedOutput}

Respond with JSON: { "shouldAdapt": true/false, "reason": "...", "adaptationScore": 0.0-1.0 }`;

    const messages = [
      { role: 'system', content: 'Evaluate adaptation need. Respond with JSON only.' },
      { role: 'user', content: evalPrompt },
    ];

    const chatOptions = { temperature: 0.2 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);

    try {
      const evaluation = JSON.parse(this.client.getTextContent(response));
      return evaluation.shouldAdapt || evaluation.adaptationScore > this.adaptationThreshold;
    } catch {
      return false;
    }
  }
}
