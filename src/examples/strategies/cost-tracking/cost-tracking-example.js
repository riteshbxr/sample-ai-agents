import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';
import { CostTracker } from './cost-tracker.js';

/**
 * Cost Tracking Example
 * Demonstrates how to track token usage and estimate costs
 */

async function costTrackingExample() {
  console.log('=== Cost Tracking Example ===\n');

  const tracker = new CostTracker();

  // Track OpenAI requests
  if (providerUtils.isProviderAvailable('openai')) {
    console.log('💰 Tracking OpenAI requests...');

    const openaiClient = createAIClient('azure-openai');
    const messages = [{ role: 'user', content: 'Explain AI agents in 100 words.' }];

    const response = await openaiClient.chat(messages);
    const costData = openaiClient.calculateCost(response);
    // trackRequest will create a client based on provider to calculate costs
    tracker.trackRequest('openai', openaiClient.model, costData, {
      prompt: messages[0].content.substring(0, 50),
    });

    console.log(`  Request cost: $${costData.totalCost.toFixed(4)}`);
    console.log(
      `  Tokens: ${costData.totalTokens} (${costData.inputTokens} in, ${costData.outputTokens} out)`
    );
  }

  // Track Claude requests
  if (providerUtils.isProviderAvailable('claude')) {
    console.log('\n💰 Tracking Claude requests...');

    const claudeClient = createAIClient('claude');
    const messages = [{ role: 'user', content: 'Explain RAG in 100 words.' }];

    const response = await claudeClient.chat(messages);
    const costData = claudeClient.calculateCost(response);
    // trackRequest will create a client based on provider to calculate costs
    tracker.trackRequest('claude', claudeClient.model, costData, {
      prompt: messages[0].content.substring(0, 50),
    });

    console.log(`  Request cost: $${costData.totalCost.toFixed(4)}`);
    console.log(
      `  Tokens: ${costData.totalTokens} (${costData.inputTokens} in, ${costData.outputTokens} out)`
    );
  }

  // Simulate multiple requests
  console.log('\n💰 Simulating multiple requests...');
  if (providerUtils.isProviderAvailable('openai')) {
    const openaiClient = createAIClient('azure-openai');
    const queries = [
      'What is machine learning?',
      'Explain neural networks.',
      'Describe transformer architecture.',
    ];

    for (const query of queries) {
      const response = await openaiClient.chat([{ role: 'user', content: query }]);
      const costData = openaiClient.calculateCost(response);
      // trackRequest will create a client based on provider to calculate costs
      tracker.trackRequest('openai', openaiClient.model, costData);
    }
  }

  // Print final report
  tracker.printReport();

  // Cost optimization tips
  console.log('\n💡 Cost Optimization Tips:');
  console.log('-'.repeat(60));
  console.log(
    `1. Use cheaper models (e.g., ${providerUtils.getDefaultModel('openai')}) for simple tasks`
  );
  console.log('2. Set max_tokens to limit output length');
  console.log('3. Cache responses for repeated queries');
  console.log('4. Use streaming to show progress without waiting');
  console.log('5. Monitor token usage and optimize prompts');
}

costTrackingExample().catch(console.error);
