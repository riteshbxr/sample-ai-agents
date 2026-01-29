import { providerUtils } from '../../../config.js';
import { ModelRouter, CascadingRouter, LoadBalancer } from './model-router.js';

/**
 * Smart Model Router Example
 * Demonstrates intelligent model routing patterns
 *
 * Patterns demonstrated:
 * 1. Task-based routing (select model based on task analysis)
 * 2. Strategy-based routing (cost, quality, speed, balanced)
 * 3. Cascading routing (try models in sequence)
 * 4. Load balancing (distribute across models)
 */

async function modelRouterExample() {
  console.log('=== Smart Model Router Example ===');
  console.log('Intelligently routing requests to appropriate models\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} as classifier provider\n`);

  try {
    // Example 1: Basic Smart Routing
    console.log('1️⃣ Basic Smart Routing');
    console.log('─'.repeat(60));

    const router = new ModelRouter({
      verbose: true,
      strategy: 'balanced',
      classifierProvider: provider,
    });

    console.log('\n📋 Registered Models:');
    for (const [id, model] of router.models) {
      console.log(`   - ${model.name} (${id})`);
      console.log(`     Capabilities: ${model.capabilities.slice(0, 4).join(', ')}`);
      console.log(`     Quality: ${model.qualityRating}/10, Speed: ${model.speedRating}/10`);
    }

    // Test different task types
    const tasks = [
      {
        task: 'What is 2+2?',
        description: 'Simple math (should use fast model)',
      },
      {
        task: 'Write a comprehensive essay analyzing the impact of artificial intelligence on modern healthcare systems.',
        description: 'Complex writing (should use high-quality model)',
      },
      {
        task: 'Write a Python function to sort a list',
        description: 'Code task (should use code-capable model)',
      },
    ];

    console.log('\n📝 Routing different task types:');
    for (const { task, description } of tasks) {
      console.log(`\n   Task: "${task.substring(0, 50)}..."`);
      console.log(`   (${description})`);

      const selection = await router.selectModel(task);

      console.log(`   → Selected: ${selection.model.name}`);
    }

    console.log('\n');

    // Example 2: Different Routing Strategies
    console.log('2️⃣ Different Routing Strategies');
    console.log('─'.repeat(60));

    const sampleTask = 'Explain the concept of recursion with examples';

    const strategies = ['cost', 'quality', 'speed', 'balanced'];

    console.log(`\n📝 Task: "${sampleTask}"`);
    console.log('\n   Results by strategy:');

    for (const strategy of strategies) {
      router.setStrategy(strategy);
      const selection = await router.selectModel(sampleTask, { skipClassification: true });
      console.log(`\n   ${strategy.toUpperCase()} strategy:`);
      console.log(`      Selected: ${selection.model.name}`);
      console.log(`      Score: ${selection.score.toFixed(1)}`);
    }

    console.log('\n');

    // Example 3: Routing with Real API Call
    console.log('3️⃣ Routing with Real API Call');
    console.log('─'.repeat(60));

    const apiRouter = new ModelRouter({
      verbose: true,
      strategy: 'balanced',
      classifierProvider: provider,
    });

    const realTask = 'What is the capital of France?';
    console.log(`\n📝 Task: "${realTask}"`);
    console.log('\nRouting and executing...');

    const result = await apiRouter.route(realTask);

    console.log(`\n📊 Result:`);
    console.log(`   Model used: ${result.modelUsed}`);
    console.log(`   Response: ${result.response?.substring(0, 200)}...`);

    console.log('\n');

    // Example 4: Cascading Router
    console.log('4️⃣ Cascading Router');
    console.log('─'.repeat(60));

    // Note: In a real scenario, you'd have multiple providers configured
    // For this demo, we'll use the available provider multiple times
    const cascadeRouter = new CascadingRouter(
      [
        { provider, qualityThreshold: 100 }, // High threshold
        { provider, qualityThreshold: 50 }, // Lower threshold
      ],
      { verbose: true }
    );

    const cascadeTask = 'Tell me a short fact about space.';
    console.log(`\n📝 Task: "${cascadeTask}"`);
    console.log('\nTrying models in cascade...');

    const cascadeResult = await cascadeRouter.route(cascadeTask);

    console.log(`\n📊 Result:`);
    console.log(`   Model used: ${cascadeResult.modelUsed}`);
    console.log(`   Attempt #: ${cascadeResult.attemptNumber}`);
    console.log(`   Response: ${cascadeResult.response?.substring(0, 150)}...`);

    console.log('\n');

    // Example 5: Load Balancer (simulated)
    console.log('5️⃣ Load Balancer');
    console.log('─'.repeat(60));

    // For demo, we'll simulate with the available provider
    const loadBalancer = new LoadBalancer([provider], {
      verbose: true,
      strategy: 'round-robin',
    });

    const lbTasks = ['What is AI?', 'What is ML?', 'What is DL?', 'What is NLP?'];

    console.log('\n📝 Distributing requests:');
    for (const task of lbTasks) {
      console.log(`\n   Task: "${task}"`);
      const model = loadBalancer.selectModel();
      console.log(`   → Routed to: ${model}`);
    }

    console.log('\n📊 Load Distribution:');
    const distribution = loadBalancer.getDistribution();
    for (const [model, count] of Object.entries(distribution)) {
      const bar = '█'.repeat(count);
      console.log(`   ${model}: ${bar} (${count} requests)`);
    }

    console.log('\n');

    // Example 6: Cost Savings Analysis
    console.log('6️⃣ Cost Savings Analysis');
    console.log('─'.repeat(60));

    const costRouter = new ModelRouter({
      verbose: false,
      strategy: 'cost',
      classifierProvider: provider,
    });

    // Simulate multiple requests
    const testTasks = [
      'What is 5 * 5?', // Simple
      'Hello', // Very simple
      'Write a haiku', // Creative but short
      'Summarize AI', // Moderate
      'Explain quantum computing in detail with examples and mathematical formulas', // Complex
    ];

    console.log('\n📝 Simulating request routing:');
    for (const task of testTasks) {
      const selection = await costRouter.selectModel(task, { skipClassification: true });
      console.log(`   "${task.substring(0, 30)}..." → ${selection.model.name}`);
    }

    const stats = costRouter.getStats();
    console.log('\n📊 Routing Statistics:');
    console.log(`   Total requests: ${stats.totalRequests}`);
    console.log(`   Strategy: ${stats.strategy}`);
    console.log(`   Model usage:`);
    for (const [model, count] of Object.entries(stats.modelUsage)) {
      console.log(`      ${model}: ${count} requests`);
    }
    console.log(`   Estimated savings: $${stats.estimatedCostSavings}`);

    console.log('\n');

    // Summary
    console.log('📋 Summary');
    console.log('─'.repeat(60));
    console.log('\n💡 Key Patterns Demonstrated:\n');

    console.log('1. Task-Based Routing:');
    console.log('   - Analyze task complexity and requirements');
    console.log('   - Match to model capabilities');
    console.log('   - Score models for best fit\n');

    console.log('2. Strategy-Based Routing:');
    console.log('   - Cost: Minimize API costs');
    console.log('   - Quality: Maximize response quality');
    console.log('   - Speed: Minimize latency');
    console.log('   - Balanced: Optimize all factors\n');

    console.log('3. Cascading Router:');
    console.log('   - Try models in sequence');
    console.log('   - Fall back on failure or low quality');
    console.log('   - Graceful degradation\n');

    console.log('4. Load Balancer:');
    console.log('   - Distribute load across models');
    console.log('   - Round-robin, least-loaded, random strategies');
    console.log('   - Prevent single model overload\n');

    console.log('5. Cost Optimization:');
    console.log('   - Track cost savings');
    console.log('   - Use cheaper models for simple tasks');
    console.log('   - Reserve expensive models for complex tasks\n');

    console.log('🔗 Use Cases:');
    console.log('   - Production AI systems with cost constraints');
    console.log('   - Multi-model deployments');
    console.log('   - A/B testing model performance');
    console.log('   - Graceful handling of model failures');
    console.log('   - Optimizing latency for user-facing applications');

    console.log('\n✅ Model Router examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
modelRouterExample().catch(console.error);
