import { estimateTokens } from '../../../utils/token-utils.js';
import { PRICING } from './pricing.js';
import { config } from '../../../config.js';

/**
 * Cost Tracker
 * Tracks token usage and estimates costs for AI API calls
 */
export class CostTracker {
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

    const defaultModel = config.openai.model;
    const pricing =
      PRICING.openai[model] ||
      PRICING.openai[defaultModel] ||
      PRICING.openai['gpt-4-turbo-preview'];
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

    const defaultModel = config.claude.model;
    const pricing =
      PRICING.claude[model] ||
      PRICING.claude[defaultModel] ||
      PRICING.claude['claude-sonnet-4-5-20250929'];
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
    // Calculate cost if not provided
    let totalCost = costData.totalCost;
    if (totalCost === undefined || totalCost === null) {
      // Calculate cost from token counts
      const promptTokens = costData.promptTokens || costData.inputTokens || 0;
      const completionTokens = costData.completionTokens || costData.outputTokens || 0;

      if (provider === 'openai') {
        const defaultModel = config.openai.model;
        const pricing =
          PRICING.openai[model] ||
          PRICING.openai[defaultModel] ||
          PRICING.openai['gpt-4-turbo-preview'];
        const inputCost = (promptTokens / 1_000_000) * pricing.input;
        const outputCost = (completionTokens / 1_000_000) * pricing.output;
        totalCost = inputCost + outputCost;
      } else if (provider === 'claude') {
        const defaultModel = config.claude.model;
        const pricing =
          PRICING.claude[model] ||
          PRICING.claude[defaultModel] ||
          PRICING.claude['claude-sonnet-4-5-20250929'];
        const inputCost = (promptTokens / 1_000_000) * pricing.input;
        const outputCost = (completionTokens / 1_000_000) * pricing.output;
        totalCost = inputCost + outputCost;
      } else {
        totalCost = 0;
      }
    }

    const request = {
      timestamp: new Date().toISOString(),
      provider,
      model,
      ...costData,
      totalCost,
      ...metadata,
    };

    this.requests.push(request);
    this.totalCost += totalCost;

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
