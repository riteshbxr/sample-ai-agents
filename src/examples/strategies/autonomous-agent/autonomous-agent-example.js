import { providerUtils } from '../../../config.js';
import { AutonomousAgent, createAutonomousAgent } from './autonomous-agent.js';

/**
 * Autonomous Agent Example
 * Demonstrates goal-driven autonomous agent patterns
 *
 * Patterns demonstrated:
 * 1. Goal-driven execution loop
 * 2. Autonomous thinking and planning
 * 3. Tool usage and task management
 * 4. Memory and context management
 * 5. Progress evaluation
 */

async function autonomousAgentExample() {
  console.log('=== Autonomous Goal-Driven Agent Example ===');
  console.log('Agents that work autonomously toward goals\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  try {
    // Example 1: Basic Autonomous Agent
    console.log('1️⃣ Basic Autonomous Agent');
    console.log('─'.repeat(60));

    const agent = createAutonomousAgent(provider, {
      verbose: true,
      maxIterations: 5, // Limited for demo
    });

    const goal1 = 'Research and summarize the key benefits of AI agents in software development';

    console.log(`\n🎯 Goal: "${goal1}"`);
    console.log('\nStarting autonomous execution...\n');

    const result1 = await agent.run(goal1);

    console.log('\n📊 Execution Summary:');
    console.log(`   Goal achieved: ${result1.achieved ? '✅' : '❌'}`);
    console.log(`   Progress: ${result1.progress}%`);
    console.log(`   Iterations: ${result1.iterations}`);
    console.log(`   Actions executed: ${result1.actionsExecuted}`);

    console.log('\n');

    // Example 2: Agent with Custom Tools
    console.log('2️⃣ Agent with Custom Tools');
    console.log('─'.repeat(60));

    const customAgent = new AutonomousAgent(provider, {
      verbose: true,
      maxIterations: 5,
    });

    // Register custom tools
    customAgent.registerTool(
      'fetchWeather',
      'Get current weather for a location',
      async (location) => {
        // Mock weather API
        console.log(`   🌤️ [Tool] Fetching weather for: ${location}`);
        return `Weather in ${location}: Sunny, 72°F, low humidity`;
      }
    );

    customAgent.registerTool('createPlan', 'Create a structured plan for a task', async (task) => {
      console.log(`   📋 [Tool] Creating plan for: ${task}`);
      return `Plan for "${task}": 1. Research 2. Analyze 3. Summarize 4. Review`;
    });

    customAgent.registerTool(
      'evaluateResult',
      'Evaluate if a result meets requirements',
      async (resultToEvaluate) => {
        console.log(`   ✅ [Tool] Evaluating result: ${resultToEvaluate?.substring(0, 30)}...`);
        return `Evaluation: Result is satisfactory. Quality score: 85/100`;
      }
    );

    const goal2 = 'Create a plan for organizing a virtual team meeting';

    console.log(`\n🎯 Goal: "${goal2}"`);
    console.log('\nRunning agent with custom tools...\n');

    const result2 = await customAgent.run(goal2);

    console.log('\n📊 Results:');
    console.log(`   Progress: ${result2.progress}%`);
    console.log(`   Actions: ${result2.actionsExecuted}`);

    // Show tool usage
    const toolActions = result2.actionHistory.filter((a) => a.action.type === 'use_tool');
    if (toolActions.length > 0) {
      console.log('\n   Tools used:');
      for (const ta of toolActions) {
        console.log(`      - ${ta.action.tool}: ${ta.result?.substring(0, 50)}...`);
      }
    }

    console.log('\n');

    // Example 3: Agent Status Monitoring
    console.log('3️⃣ Agent Status Monitoring');
    console.log('─'.repeat(60));

    const monitorAgent = createAutonomousAgent(provider, {
      verbose: false,
      maxIterations: 3,
    });

    const goal3 = 'Analyze the concept of machine learning';

    console.log(`\n🎯 Goal: "${goal3}"`);

    // Set goal and check status
    monitorAgent.setGoal(goal3);

    console.log('\n📊 Initial Status:');
    let status = monitorAgent.getStatus();
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Goal: ${status.currentGoal}`);
    console.log(`   Progress: ${status.goalProgress}%`);

    // Run agent
    console.log('\n⚡ Running agent...');
    const result3 = await monitorAgent.run(goal3);

    console.log('\n📊 Final Status:');
    status = monitorAgent.getStatus();
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Progress: ${result3.progress}%`);
    console.log(`   Iterations: ${result3.iterations}`);

    console.log('\n');

    // Example 4: Memory System
    console.log('4️⃣ Agent Memory System');
    console.log('─'.repeat(60));

    const memoryAgent = createAutonomousAgent(provider, {
      verbose: true,
      maxIterations: 4,
    });

    // Add some initial knowledge
    memoryAgent.memory.setLongTerm('userPreference', 'concise responses');
    memoryAgent.memory.setLongTerm('context', 'software development');

    const goal4 = 'Learn about and remember key programming concepts';

    console.log(`\n🎯 Goal: "${goal4}"`);
    console.log('\nPre-loaded memory:');
    console.log(`   - userPreference: ${memoryAgent.memory.getLongTerm('userPreference')}`);
    console.log(`   - context: ${memoryAgent.memory.getLongTerm('context')}`);

    console.log('\nRunning agent...\n');
    const result4 = await memoryAgent.run(goal4);

    console.log('\n📊 Memory Summary:');
    const { memorySummary } = result4;
    console.log(`   Short-term items: ${memorySummary.shortTermItems}`);
    console.log(`   Long-term facts: ${memorySummary.longTermFacts}`);
    if (memorySummary.lastAction) {
      console.log(`   Last action: ${memorySummary.lastAction.action}`);
    }

    console.log('\n');

    // Example 5: Action History Analysis
    console.log('5️⃣ Action History Analysis');
    console.log('─'.repeat(60));

    // Analyze the action history from previous runs
    console.log('\n📊 Analyzing agent behavior from Example 1:');

    const actionTypes = {};
    for (const action of result1.actionHistory) {
      actionTypes[action.action.type] = (actionTypes[action.action.type] || 0) + 1;
    }

    console.log('\n   Action distribution:');
    for (const [type, count] of Object.entries(actionTypes)) {
      const bar = '█'.repeat(count);
      console.log(`      ${type.padEnd(15)}: ${bar} (${count})`);
    }

    // Show action timeline
    console.log('\n   Action timeline:');
    for (const action of result1.actionHistory.slice(0, 5)) {
      console.log(
        `      [${action.iteration}] ${action.action.type}: ${action.action.reasoning?.substring(0, 40) || ''}...`
      );
    }

    console.log('\n');

    // Summary
    console.log('📋 Summary');
    console.log('─'.repeat(60));
    console.log('\n💡 Key Patterns Demonstrated:\n');

    console.log('1. Autonomous Loop:');
    console.log('   - Think → Decide → Act → Evaluate → Repeat');
    console.log('   - Continues until goal achieved or max iterations\n');

    console.log('2. Goal-Driven Behavior:');
    console.log('   - High-level goals drive action selection');
    console.log('   - Progress tracked and evaluated periodically\n');

    console.log('3. Tool Usage:');
    console.log('   - Agent decides when to use tools');
    console.log('   - Tools extend agent capabilities\n');

    console.log('4. Memory System:');
    console.log('   - Short-term: Recent actions and context');
    console.log('   - Long-term: Persistent facts and knowledge');
    console.log('   - Working memory: Current task context\n');

    console.log('5. Adaptive Behavior:');
    console.log('   - Adjusts strategy based on progress');
    console.log('   - Can stop when goal is achieved');
    console.log('   - Handles task failures with retries\n');

    console.log('🔗 Related Concepts:');
    console.log('   - AutoGPT / AgentGPT');
    console.log('   - BabyAGI');
    console.log('   - Goal-Oriented Action Planning (GOAP)');
    console.log('   - Belief-Desire-Intention (BDI)');
    console.log('   - Cognitive Architectures');

    console.log('\n✅ Autonomous Agent examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
autonomousAgentExample().catch(console.error);
