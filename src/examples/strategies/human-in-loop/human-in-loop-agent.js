import { createAIClient } from '../../../clients/client-factory.js';
import readline from 'readline';

/**
 * Human-in-the-Loop Agent
 * An agent that can request human input, approval, or intervention during execution.
 *
 * Key Concepts:
 * - Approval Gates: Require human approval before critical actions
 * - Input Requests: Ask humans for additional information
 * - Confidence Thresholds: Escalate to humans when uncertain
 * - Override Capability: Allow humans to correct or redirect
 *
 * Use Cases:
 * - High-stakes decisions (financial, medical, legal)
 * - Actions with irreversible consequences
 * - Quality assurance workflows
 * - Training data collection
 */

/**
 * Human Interaction Handler
 * Manages different types of human interactions
 */
export class HumanInteractionHandler {
  constructor(options = {}) {
    this.mode = options.mode || 'interactive'; // 'interactive', 'callback', 'mock'
    this.callbacks = options.callbacks || {};
    this.mockResponses = options.mockResponses || {};
    this.interactionLog = [];
    this.rl = null;
  }

  /**
   * Initialize readline interface for interactive mode
   */
  initReadline() {
    if (!this.rl && this.mode === 'interactive') {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }
  }

  /**
   * Close readline interface
   */
  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Request human input
   * @param {string} prompt - The prompt to show
   * @param {Object} options - Options for the request
   * @returns {Promise<string>} Human response
   */
  async requestInput(prompt, options = {}) {
    const interaction = {
      type: 'input',
      prompt,
      options,
      timestamp: new Date().toISOString(),
    };

    let response;

    if (this.mode === 'interactive') {
      this.initReadline();
      response = await new Promise((resolve) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log('🙋 HUMAN INPUT REQUIRED');
        console.log('='.repeat(60));
        this.rl.question(`${prompt}\n> `, (answer) => {
          resolve(answer.trim());
        });
      });
    } else if (this.mode === 'callback' && this.callbacks.onInput) {
      response = await this.callbacks.onInput(prompt, options);
    } else if (this.mode === 'mock') {
      response = this.mockResponses.input || 'mock_input_response';
      console.log(`[Mock] Human input requested: "${prompt}"`);
      console.log(`[Mock] Auto-response: "${response}"`);
    } else {
      throw new Error('No handler available for human input');
    }

    interaction.response = response;
    this.interactionLog.push(interaction);

    return response;
  }

  /**
   * Request human approval
   * @param {string} action - Description of the action requiring approval
   * @param {Object} context - Context for the approval decision
   * @returns {Promise<Object>} Approval result
   */
  async requestApproval(action, context = {}) {
    const interaction = {
      type: 'approval',
      action,
      context,
      timestamp: new Date().toISOString(),
    };

    let approved;
    let feedback;

    if (this.mode === 'interactive') {
      this.initReadline();
      console.log(`\n${'='.repeat(60)}`);
      console.log('⚠️  APPROVAL REQUIRED');
      console.log('='.repeat(60));
      console.log(`\nAction: ${action}`);
      if (context.details) {
        console.log(`Details: ${context.details}`);
      }
      if (context.risk) {
        console.log(`Risk Level: ${context.risk}`);
      }
      console.log('');

      const response = await new Promise((resolve) => {
        this.rl.question('Approve this action? (yes/no/modify): ', (answer) => {
          resolve(answer.trim().toLowerCase());
        });
      });

      if (response === 'yes' || response === 'y') {
        approved = true;
      } else if (response === 'modify' || response === 'm') {
        approved = 'modify';
        feedback = await new Promise((resolve) => {
          this.rl.question('Provide modifications: ', (answer) => {
            resolve(answer.trim());
          });
        });
      } else {
        approved = false;
        feedback = await new Promise((resolve) => {
          this.rl.question('Reason for rejection (optional): ', (answer) => {
            resolve(answer.trim() || null);
          });
        });
      }
    } else if (this.mode === 'callback' && this.callbacks.onApproval) {
      const result = await this.callbacks.onApproval(action, context);
      ({ approved, feedback } = result);
    } else if (this.mode === 'mock') {
      approved = this.mockResponses.approved !== false;
      feedback = this.mockResponses.feedback || null;
      console.log(`[Mock] Approval requested for: "${action}"`);
      console.log(`[Mock] Auto-${approved ? 'approved' : 'rejected'}`);
    } else {
      throw new Error('No handler available for approval');
    }

    interaction.approved = approved;
    interaction.feedback = feedback;
    this.interactionLog.push(interaction);

    return { approved, feedback };
  }

  /**
   * Request human choice from options
   * @param {string} question - The question to ask
   * @param {Array} options - Available options
   * @returns {Promise<Object>} Selected option
   */
  async requestChoice(question, options) {
    const interaction = {
      type: 'choice',
      question,
      options,
      timestamp: new Date().toISOString(),
    };

    let choice;

    if (this.mode === 'interactive') {
      this.initReadline();
      console.log(`\n${'='.repeat(60)}`);
      console.log('🔀 CHOICE REQUIRED');
      console.log('='.repeat(60));
      console.log(`\n${question}\n`);
      options.forEach((opt, i) => {
        console.log(`  ${i + 1}. ${opt.label || opt}`);
        if (opt.description) {
          console.log(`     ${opt.description}`);
        }
      });
      console.log('');

      const response = await new Promise((resolve) => {
        this.rl.question('Enter choice number: ', (answer) => {
          resolve(answer.trim());
        });
      });

      const choiceIndex = parseInt(response, 10) - 1;
      choice = options[choiceIndex] || options[0];
    } else if (this.mode === 'callback' && this.callbacks.onChoice) {
      choice = await this.callbacks.onChoice(question, options);
    } else if (this.mode === 'mock') {
      choice = options[this.mockResponses.choiceIndex || 0];
      console.log(`[Mock] Choice requested: "${question}"`);
      console.log(`[Mock] Auto-selected: ${JSON.stringify(choice)}`);
    } else {
      throw new Error('No handler available for choice');
    }

    interaction.choice = choice;
    this.interactionLog.push(interaction);

    return choice;
  }

  /**
   * Notify human (no response expected)
   * @param {string} message - Notification message
   * @param {string} level - Notification level (info, warning, error)
   */
  notify(message, level = 'info') {
    const interaction = {
      type: 'notification',
      message,
      level,
      timestamp: new Date().toISOString(),
    };

    const icons = { info: 'ℹ️', warning: '⚠️', error: '❌', success: '✅' };
    const icon = icons[level] || icons.info;

    if (this.mode === 'interactive' || this.mode === 'mock') {
      console.log(`\n${icon} [${level.toUpperCase()}] ${message}`);
    }

    if (this.mode === 'callback' && this.callbacks.onNotify) {
      this.callbacks.onNotify(message, level);
    }

    this.interactionLog.push(interaction);
  }

  /**
   * Get interaction history
   */
  getHistory() {
    return this.interactionLog;
  }
}

/**
 * Human-in-the-Loop Agent
 * Combines AI capabilities with human oversight
 */
export class HumanInLoopAgent {
  /**
   * Create a human-in-the-loop agent
   * @param {string} provider - AI provider
   * @param {Object} options - Configuration options
   */
  constructor(provider = 'openai', options = {}) {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.humanHandler = new HumanInteractionHandler(options.humanHandler || {});
    this.verbose = options.verbose !== false;

    // Configuration for when to involve humans
    this.config = {
      confidenceThreshold: options.confidenceThreshold || 0.7,
      approvalRequiredFor: options.approvalRequiredFor || ['delete', 'modify', 'send'],
      maxAutoActions: options.maxAutoActions || 10,
      alwaysConfirmIrreversible: options.alwaysConfirmIrreversible !== false,
    };

    this.actionCount = 0;
  }

  /**
   * Check if an action requires human approval
   * @param {Object} action - The action to check
   * @returns {boolean} Whether approval is required
   */
  requiresApproval(action) {
    // Check if action type requires approval
    if (this.config.approvalRequiredFor.some((type) => action.type?.includes(type))) {
      return true;
    }

    // Check if action is marked as irreversible
    if (action.irreversible && this.config.alwaysConfirmIrreversible) {
      return true;
    }

    // Check if we've exceeded max auto actions
    if (this.actionCount >= this.config.maxAutoActions) {
      return true;
    }

    return false;
  }

  /**
   * Assess confidence in a decision
   * @param {string} task - The task
   * @param {string} proposedResponse - The proposed response
   * @returns {Promise<Object>} Confidence assessment
   */
  async assessConfidence(task, proposedResponse) {
    const assessPrompt = `Assess your confidence in this response.

TASK: ${task}

PROPOSED RESPONSE: ${proposedResponse}

Evaluate:
1. How confident are you in the accuracy? (0.0-1.0)
2. Are there any uncertainties or assumptions?
3. Would you recommend human review?

Respond with JSON: { "confidence": 0.0, "uncertainties": [...], "recommendReview": true/false, "reason": "..." }`;

    const messages = [
      { role: 'system', content: 'Assess response confidence. Respond with JSON only.' },
      { role: 'user', content: assessPrompt },
    ];

    const chatOptions = { temperature: 0.1 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);

    try {
      return JSON.parse(this.client.getTextContent(response));
    } catch {
      return { confidence: 0.5, uncertainties: ['Unable to assess'], recommendReview: true };
    }
  }

  /**
   * Execute a task with human oversight
   * @param {string} task - The task to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(task, options = {}) {
    if (this.verbose) {
      console.log('\n🤖 Agent processing task...');
    }

    // Generate initial response
    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant working with human oversight. 
Be clear about any uncertainties or assumptions in your response.`,
      },
      { role: 'user', content: task },
    ];

    const aiResponse = await this.client.chat(messages, { temperature: 0.5 });
    const proposedResponse = this.client.getTextContent(aiResponse);

    if (this.verbose) {
      console.log(`\n📝 Proposed response: ${proposedResponse.substring(0, 200)}...`);
    }

    // Assess confidence
    const confidence = await this.assessConfidence(task, proposedResponse);

    if (this.verbose) {
      console.log(`\n📊 Confidence: ${(confidence.confidence * 100).toFixed(1)}%`);
      if (confidence.uncertainties?.length > 0) {
        console.log(`   Uncertainties: ${confidence.uncertainties.join(', ')}`);
      }
    }

    // Determine if human review is needed
    const needsReview =
      confidence.recommendReview ||
      confidence.confidence < this.config.confidenceThreshold ||
      options.forceReview;

    if (needsReview) {
      this.humanHandler.notify(
        `AI confidence: ${(confidence.confidence * 100).toFixed(1)}% - Requesting human review`,
        'warning'
      );

      // Request approval
      const approval = await this.humanHandler.requestApproval('Review and approve AI response', {
        details: proposedResponse,
        confidence: confidence.confidence,
        risk: confidence.confidence < 0.5 ? 'high' : 'medium',
      });

      if (approval.approved === true) {
        this.humanHandler.notify('Response approved by human', 'success');
        return {
          response: proposedResponse,
          humanApproved: true,
          confidence,
        };
      } else if (approval.approved === 'modify') {
        // Use human's modification
        this.humanHandler.notify('Response modified by human', 'info');
        return {
          response: approval.feedback,
          humanModified: true,
          originalResponse: proposedResponse,
          confidence,
        };
      } else {
        // Response rejected - ask for human input
        this.humanHandler.notify('Response rejected by human', 'warning');
        const humanResponse = await this.humanHandler.requestInput(
          'Please provide the correct response:'
        );
        return {
          response: humanResponse,
          humanProvided: true,
          rejectedResponse: proposedResponse,
          rejectionReason: approval.feedback,
          confidence,
        };
      }
    }

    // Auto-approve if confidence is high
    this.actionCount++;

    if (this.verbose) {
      console.log('\n✅ Response auto-approved (high confidence)');
    }

    return {
      response: proposedResponse,
      autoApproved: true,
      confidence,
    };
  }

  /**
   * Execute an action that may require approval
   * @param {Object} action - The action to execute
   * @returns {Promise<Object>} Action result
   */
  async executeAction(action) {
    if (this.verbose) {
      console.log(`\n⚡ Evaluating action: ${action.type}`);
    }

    if (this.requiresApproval(action)) {
      const approval = await this.humanHandler.requestApproval(`Execute action: ${action.type}`, {
        details: action.description,
        data: action.data,
        risk: action.irreversible ? 'high' : 'medium',
      });

      if (!approval.approved) {
        return {
          status: 'rejected',
          action,
          reason: approval.feedback,
        };
      }

      if (approval.approved === 'modify' && approval.feedback) {
        action.data = approval.feedback;
      }
    }

    // Execute the action
    if (this.verbose) {
      console.log(`   ✅ Executing action: ${action.type}`);
    }

    // Mock action execution
    const result = await this.mockActionExecution(action);
    this.actionCount++;

    return {
      status: 'executed',
      action,
      result,
    };
  }

  /**
   * Mock action execution for demonstration
   */
  async mockActionExecution(action) {
    // Simulate action execution
    return {
      success: true,
      actionType: action.type,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Interactive session with escalation
   * @param {Array} tasks - Tasks to process
   * @returns {Promise<Object>} Session results
   */
  async session(tasks) {
    const results = [];

    for (const task of tasks) {
      const result = await this.execute(task);
      results.push({
        task,
        ...result,
      });
    }

    // Close readline if used
    this.humanHandler.close();

    return {
      totalTasks: tasks.length,
      results,
      humanInteractions: this.humanHandler.getHistory().length,
      interactionLog: this.humanHandler.getHistory(),
    };
  }

  /**
   * Reset action counter
   */
  resetActionCount() {
    this.actionCount = 0;
  }
}

/**
 * Approval Workflow Builder
 * Helps create approval workflows for different scenarios
 */
export class ApprovalWorkflowBuilder {
  constructor() {
    this.stages = [];
  }

  /**
   * Add an approval stage
   */
  addStage(name, config) {
    this.stages.push({ name, ...config });
    return this;
  }

  /**
   * Build the workflow
   */
  build() {
    return this.stages;
  }

  /**
   * Create common workflow templates
   */
  static createDocumentReviewWorkflow() {
    return new ApprovalWorkflowBuilder()
      .addStage('draft', { autoApprove: true, notifyLevel: 'info' })
      .addStage('review', { requiresApproval: true, approvers: ['reviewer'] })
      .addStage('legal', { requiresApproval: true, approvers: ['legal_team'] })
      .addStage('publish', { requiresApproval: true, approvers: ['manager'] })
      .build();
  }

  static createCodeDeploymentWorkflow() {
    return new ApprovalWorkflowBuilder()
      .addStage('test', { autoApprove: true })
      .addStage('staging', { requiresApproval: true, approvers: ['qa_lead'] })
      .addStage('production', {
        requiresApproval: true,
        approvers: ['tech_lead', 'manager'],
      })
      .build();
  }
}
