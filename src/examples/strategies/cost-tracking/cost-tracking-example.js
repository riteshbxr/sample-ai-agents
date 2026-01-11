import { OpenAIClient } from '../../clients/openai-client.js';
import { ClaudeClient } from '../../clients/claude-client.js';
import { estimateTokens } from '../../utils/token-utils.js';

/**
 * Cost Tracking Example
 * Demonstrates how to track token usage and estimate costs
 */

// Pricing per 1M tokens (as of 2024, adjust as needed)
const PRICING = {
  openai: {
    'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  },
  claude: {
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
    'claude-3-opus': { input: 15.0, output: 75.0 },
  },
};

class CostTracker {
  constructor() {
    this.requests = [];
    this.totalCost = 0;
  }

  /**
   * Estimate tokens (using utility function)
   */
  estimateTokens(text) {
    return estimateTokens(text);
  }

  /**
   * Calculate cost for OpenAI response
   */
  calculateOpenAICost(response, model) {
    const usage = response.usage;
    if (!usage) return 0;

    const pricing = PRICING.openai[model] || PRICING.openai['gpt-4-turbo-preview'];
    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      inputCost,
      outputCost,
      totalCost,
    };
  }

  /**
   * Calculate cost for Claude response
   */
  calculateClaudeCost(response, model) {
    const usage = response.usage;
    if (!usage) return 0;

    const pricing = PRICING.claude[model] || PRICING.claude['claude-sonnet-4-5-20250929'];
    const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
      inputCost,
      outputCost,
      totalCost,
    };
  }

  /**
   * Track a request
   */
  trackRequest(provider, model, costData, metadata = {}) {
    const request = {
      timestamp: new Date().toISOString(),
      provider,
      model,
      ...costData,
      ...metadata,
    };

    this.requests.push(request);
    this.totalCost += costData.totalCost;

    return request;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      totalRequests: this.requests.length,
      totalCost: this.totalCost,
      totalTokens: this.requests.reduce((sum, r) => sum + r.totalTokens, 0),
      byProvider: {},
      byModel: {},
    };

    this.requests.forEach((req) => {
      // By provider
      if (!stats.byProvider[req.provider]) {
        stats.byProvider[req.provider] = { count: 0, cost: 0, tokens: 0 };
      }
      stats.byProvider[req.provider].count++;
      stats.byProvider[req.provider].cost += req.totalCost;
      stats.byProvider[req.provider].tokens += req.totalTokens;

      // By model
      if (!stats.byModel[req.model]) {
        stats.byModel[req.model] = { count: 0, cost: 0, tokens: 0 };
      }
      stats.byModel[req.model].count++;
      stats.byModel[req.model].cost += req.totalCost;
      stats.byModel[req.model].tokens += req.totalTokens;
    });

    return stats;
  }

  /**
   * Print cost report
   */
  printReport() {
    const stats = this.getStats();

    console.log('\n📊 Cost Tracking Report');
    console.log('='.repeat(60));
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Total Tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`Total Cost: $${stats.totalCost.toFixed(4)}`);
    console.log('\nBy Provider:');
    Object.entries(stats.byProvider).forEach(([provider, data]) => {
      console.log(
        `  ${provider}: ${data.count} requests, $${data.cost.toFixed(4)}, ${data.tokens.toLocaleString()} tokens`
      );
    });
    console.log('\nBy Model:');
    Object.entries(stats.byModel).forEach(([model, data]) => {
      console.log(
        `  ${model}: ${data.count} requests, $${data.cost.toFixed(4)}, ${data.tokens.toLocaleString()} tokens`
      );
    });
  }
}

async function costTrackingExample() {
  console.log('=== Cost Tracking Example ===\n');

  const tracker = new CostTracker();

  // Track OpenAI requests
  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    console.log('💰 Tracking OpenAI requests...');

    const openaiClient = new OpenAIClient();
    const messages = [{ role: 'user', content: 'Explain AI agents in 100 words.' }];

    const response = await openaiClient.chat(messages);
    const costData = tracker.calculateOpenAICost(response, openaiClient.model);
    tracker.trackRequest('openai', openaiClient.model, costData, {
      prompt: messages[0].content.substring(0, 50),
    });

    console.log(`  Request cost: $${costData.totalCost.toFixed(4)}`);
    console.log(
      `  Tokens: ${costData.totalTokens} (${costData.inputTokens} in, ${costData.outputTokens} out)`
    );
  }

  // Track Claude requests
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n💰 Tracking Claude requests...');

    const claudeClient = new ClaudeClient();
    const messages = [{ role: 'user', content: 'Explain RAG in 100 words.' }];

    const response = await claudeClient.chat(messages);
    const costData = tracker.calculateClaudeCost(response, claudeClient.model);
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
  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAIClient();
    const queries = [
      'What is machine learning?',
      'Explain neural networks.',
      'Describe transformer architecture.',
    ];

    for (const query of queries) {
      const response = await openaiClient.chat([{ role: 'user', content: query }]);
      const costData = tracker.calculateOpenAICost(response, openaiClient.model);
      tracker.trackRequest('openai', openaiClient.model, costData);
    }
  }

  // Print final report
  tracker.printReport();

  // Cost optimization tips
  console.log('\n💡 Cost Optimization Tips:');
  console.log('-'.repeat(60));
  console.log('1. Use cheaper models (gpt-3.5-turbo) for simple tasks');
  console.log('2. Set max_tokens to limit output length');
  console.log('3. Cache responses for repeated queries');
  console.log('4. Use streaming to show progress without waiting');
  console.log('5. Monitor token usage and optimize prompts');
}

costTrackingExample().catch(console.error);
