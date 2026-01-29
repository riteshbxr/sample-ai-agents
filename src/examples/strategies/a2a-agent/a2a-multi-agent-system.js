import { AgentMessageBus } from './agent-message-bus.js';
import { A2AAgent } from './a2a-agent.js';

/**
 * A2A Multi-Agent System
 */
export class A2AMultiAgentSystem {
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
