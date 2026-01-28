import { providerUtils } from '../../../config.js';
import {
  PlanningAgent,
  HierarchicalPlanningAgent,
  AdaptivePlanningAgent,
} from './planning-agent.js';

/**
 * Planning Agent Example
 * Demonstrates agents that create and execute structured plans
 *
 * Patterns demonstrated:
 * 1. Basic Plan-and-Execute (create plan, execute steps)
 * 2. Hierarchical Planning (decompose into sub-goals)
 * 3. Adaptive Planning (adjust plan based on results)
 */

async function planningAgentExample() {
  console.log('=== Planning Agent Example ===');
  console.log('Agents that create structured plans before executing\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  try {
    // Example 1: Basic Plan-and-Execute
    console.log('1️⃣ Basic Plan-and-Execute');
    console.log('─'.repeat(60));

    const agent = new PlanningAgent(provider, {
      maxSteps: 10,
      verbose: true,
    });

    // Register some mock tools
    agent.registerTool('search', 'Search for information on a topic', async (query) => {
      console.log(`   🔍 [Tool] Searching: ${query}`);
      // Mock search results
      const results = {
        'AI agents': 'AI agents are autonomous systems that use LLMs to perform tasks.',
        'planning patterns':
          'Plan-and-Solve prompting improves reasoning by creating explicit plans.',
        default: 'Search completed with relevant information.',
      };
      return results[query] || results.default;
    });

    agent.registerTool('calculate', 'Perform mathematical calculations', async (expression) => {
      console.log(`   🧮 [Tool] Calculating: ${expression}`);
      try {
        // Safe evaluation for demo
        const result = Function(`"use strict"; return (${expression})`)();
        return `Result: ${result}`;
      } catch {
        return 'Calculation error';
      }
    });

    agent.registerTool('summarize', 'Summarize given text', async (text) => {
      console.log(`   📝 [Tool] Summarizing text...`);
      return `Summary: ${text.substring(0, 100)}... (summarized)`;
    });

    const goal1 =
      'Research AI agent planning patterns and create a summary of the top 3 techniques';

    console.log(`\n📝 Goal: "${goal1}"`);
    console.log('\nExecuting plan...\n');

    const result1 = await agent.execute(goal1);

    console.log('\n📊 Execution Results:');
    console.log(`   Success: ${result1.success ? '✅' : '❌'}`);
    console.log(`   Steps executed: ${result1.executionHistory.length}`);
    console.log(`   Re-plans: ${result1.plan.replanCount || 0}`);
    console.log(`\n   Summary: ${result1.summary?.substring(0, 300)}...`);

    console.log('\n');

    // Example 2: Hierarchical Planning
    console.log('2️⃣ Hierarchical Planning');
    console.log('─'.repeat(60));

    const hierarchicalAgent = new HierarchicalPlanningAgent(provider, {
      verbose: true,
    });

    const complexGoal =
      'Create a comprehensive report on the state of AI in 2024, including trends, challenges, and predictions';

    console.log(`\n📝 Complex Goal: "${complexGoal}"`);
    console.log('\nCreating hierarchical plan...\n');

    const hierarchicalPlan = await hierarchicalAgent.createHierarchicalPlan(complexGoal);

    console.log('\n📊 Hierarchical Plan:');
    console.log(`   Main Goal: ${hierarchicalPlan.goal}`);
    console.log(`   Sub-goals: ${hierarchicalPlan.subGoals?.length || 0}`);

    if (hierarchicalPlan.subGoals) {
      for (const subGoal of hierarchicalPlan.subGoals.slice(0, 3)) {
        console.log(`\n   📌 Sub-goal: ${subGoal.description}`);
        console.log(`      Steps: ${subGoal.steps?.length || 0}`);
        if (subGoal.steps?.[0]) {
          console.log(`      First step: ${subGoal.steps[0].description}`);
        }
      }
    }

    console.log('\n');

    // Example 3: Plan with Dependencies
    console.log('3️⃣ Plan with Dependencies');
    console.log('─'.repeat(60));

    const dependencyAgent = new PlanningAgent(provider, {
      maxSteps: 8,
      verbose: true,
    });

    dependencyAgent.registerTool('fetchData', 'Fetch data from a source', async (source) => {
      console.log(`   📥 [Tool] Fetching data from: ${source}`);
      return { data: 'Sample data', source, timestamp: new Date().toISOString() };
    });

    dependencyAgent.registerTool('processData', 'Process and transform data', async (data) => {
      console.log(`   ⚙️ [Tool] Processing data...`);
      return { processed: true, original: data, result: 'Processed result' };
    });

    const dependencyGoal = 'Fetch data from multiple sources, process it, and generate insights';

    console.log(`\n📝 Goal: "${dependencyGoal}"`);
    console.log('\nExecuting plan with dependencies...\n');

    const result3 = await dependencyAgent.execute(dependencyGoal);

    console.log('\n📊 Results:');
    console.log(`   Success: ${result3.success ? '✅' : '❌'}`);
    console.log(`   Steps: ${result3.executionHistory.length}`);

    // Show dependency flow
    console.log('\n   Execution Flow:');
    for (const step of result3.executionHistory) {
      console.log(`      Step ${step.stepId}: ${step.status} (${step.duration}ms)`);
    }

    console.log('\n');

    // Example 4: Adaptive Planning (simulated)
    console.log('4️⃣ Adaptive Planning');
    console.log('─'.repeat(60));

    const adaptiveAgent = new AdaptivePlanningAgent(provider, {
      verbose: true,
      adaptationThreshold: 0.3,
    });

    adaptiveAgent.registerTool('webRequest', 'Make a web request', async (url) => {
      console.log(`   🌐 [Tool] Requesting: ${url}`);
      // Simulate occasional failures for demonstration
      if (Math.random() < 0.3) {
        throw new Error('Network timeout');
      }
      return { status: 200, data: 'Response data' };
    });

    const adaptiveGoal = 'Gather information from multiple web sources with error handling';

    console.log(`\n📝 Goal: "${adaptiveGoal}"`);
    console.log('\nExecuting with adaptive re-planning...\n');

    const result4 = await adaptiveAgent.execute(adaptiveGoal);

    console.log('\n📊 Adaptive Execution Results:');
    console.log(`   Success: ${result4.success ? '✅' : '❌'}`);
    console.log(`   Total steps executed: ${result4.executionHistory.length}`);
    console.log(`   Re-plans triggered: ${result4.plan.replanCount || 0}`);

    console.log('\n');

    // Summary
    console.log('📋 Summary');
    console.log('─'.repeat(60));
    console.log('\n💡 Key Patterns Demonstrated:\n');

    console.log('1. Plan-and-Solve:');
    console.log('   - Create explicit plan before execution');
    console.log('   - Execute step by step with tracking');
    console.log('   - Better reasoning through structured approach\n');

    console.log('2. Hierarchical Planning:');
    console.log('   - Decompose complex goals into sub-goals');
    console.log('   - Each sub-goal has its own steps');
    console.log('   - Manages complexity through abstraction\n');

    console.log('3. Dependency Management:');
    console.log('   - Steps can depend on other steps');
    console.log('   - Execution respects dependency order');
    console.log('   - Enables parallel execution of independent steps\n');

    console.log('4. Adaptive Re-planning:');
    console.log('   - Monitor execution results');
    console.log('   - Detect when plan needs adjustment');
    console.log('   - Dynamically create new plan based on feedback\n');

    console.log('🔗 Related Concepts:');
    console.log('   - Plan-and-Solve Prompting (Wang et al.)');
    console.log('   - ReWOO: Reasoning WithOut Observation');
    console.log('   - DEPS: Describe, Explain, Plan, Select');
    console.log('   - Tree of Thoughts (Yao et al.)');
    console.log('   - Graph of Thoughts (Besta et al.)');

    console.log('\n✅ Planning Agent examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
planningAgentExample().catch(console.error);
