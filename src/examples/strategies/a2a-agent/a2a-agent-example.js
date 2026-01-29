import { FunctionCallingAgent } from '../../agents/function-calling-agent.js';
import { providerUtils } from '../../config.js';

/**
 * Agent-to-Agent (A2A) Communication Example
 * Demonstrates direct communication between AI agents for collaborative problem-solving
 *
 * A2A communication enables:
 * - Direct agent-to-agent messaging
 * - Negotiation and consensus building
 * - Distributed problem-solving
 * - Real-time collaboration
 */

/**
 * Message Bus for Agent Communication
 */
class AgentMessageBus {
  constructor() {
    this.messages = [];
    this.subscribers = new Map(); // agentId -> callback
  }

  /**
   * Subscribe an agent to receive messages
   */
  subscribe(agentId, callback) {
    this.subscribers.set(agentId, callback);
  }

  /**
   * Send a message from one agent to another
   */
  sendMessage(fromAgentId, toAgentId, message, metadata = {}) {
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: fromAgentId,
      to: toAgentId,
      content: message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.messages.push(msg);

    // Deliver message if recipient is subscribed
    if (this.subscribers.has(toAgentId)) {
      const callback = this.subscribers.get(toAgentId);
      callback(msg);
    }

    return msg;
  }

  /**
   * Broadcast message to all agents except sender
   */
  broadcast(fromAgentId, message, metadata = {}) {
    const recipients = Array.from(this.subscribers.keys()).filter((id) => id !== fromAgentId);
    return recipients.map((toId) => this.sendMessage(fromAgentId, toId, message, metadata));
  }

  /**
   * Get messages for a specific agent
   */
  getMessages(agentId) {
    return this.messages.filter((msg) => msg.to === agentId || msg.from === agentId);
  }
}

/**
 * Base Agent with A2A Communication Capabilities
 */
class A2AAgent {
  constructor(id, name, role, provider = 'openai') {
    this.id = id;
    this.name = name;
    this.role = role;
    this.agent = new FunctionCallingAgent(provider);
    this.messageBus = null;
    this.inbox = [];
    this.setupAgent();
  }

  setupAgent() {
    // Register function to send messages to other agents
    this.agent.registerFunction(
      'sendMessage',
      'Send a message to another agent',
      {
        type: 'object',
        properties: {
          toAgentId: { type: 'string', description: 'ID of the recipient agent' },
          message: { type: 'string', description: 'Message content to send' },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Message priority',
          },
        },
        required: ['toAgentId', 'message'],
      },
      async ({ toAgentId, message, priority = 'normal' }) => {
        if (this.messageBus) {
          const msg = this.messageBus.sendMessage(this.id, toAgentId, message, { priority });
          console.log(`  📤 [${this.name}] → [${toAgentId}]: ${message.substring(0, 60)}...`);
          return { success: true, messageId: msg.id };
        }
        return { success: false, error: 'Message bus not connected' };
      }
    );

    // Register function to broadcast messages
    this.agent.registerFunction(
      'broadcast',
      'Broadcast a message to all other agents',
      {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message content to broadcast' },
        },
        required: ['message'],
      },
      async ({ message }) => {
        if (this.messageBus) {
          const messages = this.messageBus.broadcast(this.id, message);
          console.log(`  📢 [${this.name}] Broadcast: ${message.substring(0, 60)}...`);
          return {
            success: true,
            recipients: messages.length,
            messageIds: messages.map((m) => m.id),
          };
        }
        return { success: false, error: 'Message bus not connected' };
      }
    );

    // Register function to check inbox
    this.agent.registerFunction(
      'checkInbox',
      'Check messages received from other agents',
      {
        type: 'object',
        properties: {
          unreadOnly: { type: 'boolean', description: 'Only return unread messages' },
        },
      },
      async ({ unreadOnly = true }) => {
        const messages = this.messageBus?.getMessages(this.id) || [];
        const relevant = unreadOnly
          ? messages.filter((m) => !m.read && m.to === this.id)
          : messages.filter((m) => m.to === this.id);

        // Mark as read
        relevant.forEach((m) => (m.read = true));

        return {
          count: relevant.length,
          messages: relevant.map((m) => ({
            from: m.from,
            content: m.content,
            timestamp: m.timestamp,
          })),
        };
      }
    );
  }

  /**
   * Connect agent to message bus
   */
  connect(messageBus) {
    this.messageBus = messageBus;
    messageBus.subscribe(this.id, (message) => {
      this.inbox.push(message);
      console.log(
        `  📥 [${this.name}] Received from [${message.from}]: ${message.content.substring(0, 60)}...`
      );
    });
  }

  /**
   * Process a task with A2A communication
   */
  async process(task, context = {}) {
    const systemPrompt = `You are ${this.name}, a ${this.role}. 
You can communicate with other agents using the sendMessage and broadcast functions.
You can check your inbox for messages from other agents using checkInbox.

Current context: ${JSON.stringify(context)}

Your task: ${task}

Work collaboratively with other agents to complete this task.`;

    return await this.agent.chat(systemPrompt);
  }
}

/**
 * A2A Multi-Agent System
 */
class A2AMultiAgentSystem {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.messageBus = new AgentMessageBus();
    this.agents = new Map();

    // Create specialized agents
    this.createAgents();
  }

  createAgents() {
    // Research Agent - Gathers information
    const researchAgent = new A2AAgent(
      'research',
      'Research Agent',
      'information researcher',
      this.provider
    );
    researchAgent.connect(this.messageBus);
    this.agents.set('research', researchAgent);

    // Analysis Agent - Analyzes data
    const analysisAgent = new A2AAgent('analysis', 'Analysis Agent', 'data analyst', this.provider);
    analysisAgent.connect(this.messageBus);
    this.agents.set('analysis', analysisAgent);

    // Strategy Agent - Creates strategies
    const strategyAgent = new A2AAgent(
      'strategy',
      'Strategy Agent',
      'strategic planner',
      this.provider
    );
    strategyAgent.connect(this.messageBus);
    this.agents.set('strategy', strategyAgent);

    // Coordinator Agent - Coordinates the team
    const coordinatorAgent = new A2AAgent(
      'coordinator',
      'Coordinator Agent',
      'team coordinator',
      this.provider
    );
    coordinatorAgent.connect(this.messageBus);
    this.agents.set('coordinator', coordinatorAgent);
  }

  /**
   * Example 1: Collaborative Research Task
   */
  async collaborativeResearch(task) {
    console.log('\n🔬 Example 1: Collaborative Research');
    console.log('='.repeat(60));
    console.log(`Task: ${task}\n`);

    // Coordinator initiates the task
    console.log('👤 [Coordinator] Initiating collaborative research...');
    const coordinator = this.agents.get('coordinator');
    await coordinator.process(
      `Coordinate a research task: "${task}". 
      First, ask the research agent to gather information, then have the analysis agent analyze it, 
      and finally have the strategy agent create recommendations.`,
      { task, agents: ['research', 'analysis', 'strategy'] }
    );

    // Research agent gathers information
    console.log('\n👤 [Research Agent] Gathering information...');
    const researchAgent = this.agents.get('research');
    const researchResult = await researchAgent.process(
      `Research information about: ${task}. 
      Once you have gathered information, send it to the analysis agent.`,
      { task, nextAgent: 'analysis' }
    );

    // Analysis agent analyzes the research
    console.log('\n👤 [Analysis Agent] Analyzing research findings...');
    const analysisAgent = this.agents.get('analysis');
    const analysisResult = await analysisAgent.process(
      `Analyze the research findings about: ${task}. 
      Check your inbox for messages from the research agent, then send your analysis to the strategy agent.`,
      { task, previousAgent: 'research', nextAgent: 'strategy' }
    );

    // Strategy agent creates recommendations
    console.log('\n👤 [Strategy Agent] Creating strategic recommendations...');
    const strategyAgent = this.agents.get('strategy');
    const strategyResult = await strategyAgent.process(
      `Based on the research and analysis about: ${task}, create strategic recommendations. 
      Check your inbox for messages from the analysis agent.`,
      { task, previousAgent: 'analysis' }
    );

    return {
      research: researchResult,
      analysis: analysisResult,
      strategy: strategyResult,
    };
  }

  /**
   * Example 2: Negotiation and Consensus
   */
  async negotiationExample(problem) {
    console.log('\n\n🤝 Example 2: Agent Negotiation and Consensus');
    console.log('='.repeat(60));
    console.log(`Problem: ${problem}\n`);

    // Each agent proposes a solution
    console.log('👤 [Research Agent] Proposing solution...');
    const researchAgent = this.agents.get('research');
    const researchProposal = await researchAgent.process(
      `Propose a solution to: ${problem}. 
      Broadcast your proposal to all other agents and ask for their feedback.`,
      { problem, action: 'propose' }
    );

    console.log('\n👤 [Analysis Agent] Proposing solution...');
    const analysisAgent = this.agents.get('analysis');
    const analysisProposal = await analysisAgent.process(
      `Propose a solution to: ${problem}. 
      Check your inbox for the research agent's proposal, then broadcast your own proposal.`,
      { problem, action: 'propose' }
    );

    console.log('\n👤 [Strategy Agent] Proposing solution...');
    const strategyAgent = this.agents.get('strategy');
    const strategyProposal = await strategyAgent.process(
      `Propose a solution to: ${problem}. 
      Check your inbox for proposals from other agents, then broadcast your proposal.`,
      { problem, action: 'propose' }
    );

    // Coordinator reaches consensus
    console.log('\n👤 [Coordinator] Reaching consensus...');
    const coordinator = this.agents.get('coordinator');
    const consensus = await coordinator.process(
      `Review all proposals for: ${problem}. 
      Check your inbox for proposals from all agents, then create a consensus solution that incorporates the best ideas.`,
      { problem, action: 'consensus' }
    );

    return {
      proposals: {
        research: researchProposal,
        analysis: analysisProposal,
        strategy: strategyProposal,
      },
      consensus,
    };
  }

  /**
   * Example 3: Distributed Problem Solving
   */
  async distributedProblemSolving(complexTask) {
    console.log('\n\n🌐 Example 3: Distributed Problem Solving');
    console.log('='.repeat(60));
    console.log(`Complex Task: ${complexTask}\n`);

    // Break down the task into subtasks
    const subtasks = [
      'Gather relevant data and information',
      'Analyze the data for patterns and insights',
      'Develop a strategic approach',
    ];

    // Agents work on subtasks in parallel (simulated)
    const results = await Promise.all([
      this.agents.get('research').process(
        `Work on this subtask: ${subtasks[0]}. 
        This is part of a larger task: ${complexTask}. 
        Share your findings with other agents when ready.`,
        { subtask: subtasks[0], mainTask: complexTask }
      ),
      this.agents.get('analysis').process(
        `Work on this subtask: ${subtasks[1]}. 
        This is part of a larger task: ${complexTask}. 
        Check your inbox for findings from the research agent, then share your analysis.`,
        { subtask: subtasks[1], mainTask: complexTask }
      ),
      this.agents.get('strategy').process(
        `Work on this subtask: ${subtasks[2]}. 
        This is part of a larger task: ${complexTask}. 
        Check your inbox for information from other agents, then develop your strategy.`,
        { subtask: subtasks[2], mainTask: complexTask }
      ),
    ]);

    // Coordinator synthesizes results
    console.log('\n👤 [Coordinator] Synthesizing distributed results...');
    const coordinator = this.agents.get('coordinator');
    const synthesis = await coordinator.process(
      `Synthesize the results from all agents working on: ${complexTask}. 
      Check your inbox for messages from research, analysis, and strategy agents. 
      Create a comprehensive solution that combines all their work.`,
      { mainTask: complexTask, agents: ['research', 'analysis', 'strategy'] }
    );

    return {
      distributedResults: results,
      synthesis,
    };
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats() {
    const { messages } = this.messageBus;
    return {
      totalMessages: messages.length,
      messagesByAgent: Array.from(this.agents.keys()).reduce((acc, agentId) => {
        acc[agentId] = {
          sent: messages.filter((m) => m.from === agentId).length,
          received: messages.filter((m) => m.to === agentId).length,
        };
        return acc;
      }, {}),
      messageHistory: messages.map((m) => ({
        from: m.from,
        to: m.to,
        content: `${m.content.substring(0, 50)}...`,
        timestamp: m.timestamp,
      })),
    };
  }
}

/**
 * Main example function
 */
async function a2aAgentExample() {
  console.log('=== Agent-to-Agent (A2A) Communication Example ===');
  console.log('Direct agent communication for collaborative problem-solving\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  const system = new A2AMultiAgentSystem(provider);

  try {
    // Example 1: Collaborative Research
    await system.collaborativeResearch('Best practices for building AI agent systems in 2024');
    console.log('\n✅ Collaborative research completed');

    // Example 2: Negotiation
    await system.negotiationExample('How should we prioritize features for an AI agent platform?');
    console.log('\n✅ Negotiation and consensus reached');

    // Example 3: Distributed Problem Solving
    await system.distributedProblemSolving(
      'Design a comprehensive AI agent architecture for enterprise use'
    );
    console.log('\n✅ Distributed problem solving completed');

    // Show communication statistics
    console.log('\n\n📊 Communication Statistics');
    console.log('='.repeat(60));
    const stats = system.getCommunicationStats();
    console.log(`Total Messages: ${stats.totalMessages}`);
    console.log('\nMessages by Agent:');
    Object.entries(stats.messagesByAgent).forEach(([agentId, counts]) => {
      console.log(`  ${agentId}: ${counts.sent} sent, ${counts.received} received`);
    });

    console.log('\n\n✅ All A2A communication examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Direct agent-to-agent messaging');
    console.log('  - Broadcast communication');
    console.log('  - Message inbox management');
    console.log('  - Collaborative problem-solving');
    console.log('  - Negotiation and consensus building');
    console.log('  - Distributed task execution');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
a2aAgentExample().catch(console.error);
