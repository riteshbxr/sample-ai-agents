import { estimateTokens } from '../../../utils/token-utils.js';
import { PRICING } from '../../../utils/pricing.js';
import { providerUtils } from '../../../config.js';
import { createAIClient } from '../../../clients/client-factory.js';

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
   * Track a request
   * @param {string} provider - Provider name ('openai', 'claude', etc.)
   * @param {string} model - Model name
   * @param {Object} costData - Cost data (may include tokens, costs, or response object)
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {Object} Tracked request object
   */
  trackRequest(provider, model, costData, metadata = {}) {
    // Calculate cost if not provided
    let { totalCost } = costData;
    let finalCostData = { ...costData };

    if (totalCost === undefined || totalCost === null) {
      // Try to create a client based on provider and use its calculateCost method
      let client = null;
      try {
        // Map provider to client factory provider
        let factoryProvider = provider;
        if (provider === 'openai') {
          // Use 'openai' which will route based on config
          factoryProvider = 'openai';
        } else if (provider === 'azure-openai' || provider === 'openai-standard') {
          factoryProvider = provider;
        } else if (provider === 'claude') {
          factoryProvider = 'claude';
        } else if (provider === 'mock') {
          factoryProvider = 'mock';
        }

        // Create client with the model
        client = createAIClient(factoryProvider, model);
      } catch {
        // If client creation fails (e.g., missing API keys), fall back to manual calculation
        client = null;
      }

      // If client was created and has calculateCost method, use it
      if (client && typeof client.calculateCost === 'function') {
        // Check if costData is a response object with usage
        if (costData.usage) {
          // costData is already a response object
          finalCostData = client.calculateCost(costData, model);
          ({ totalCost } = finalCostData);
        } else {
          // Construct a mock response object with usage from token counts
          const promptTokens = costData.promptTokens || costData.inputTokens || 0;
          const completionTokens = costData.completionTokens || costData.outputTokens || 0;

          // Determine response format based on provider
          const isClaude = provider === 'claude';

          const mockResponse = {
            usage: isClaude
              ? {
                  input_tokens: promptTokens,
                  output_tokens: completionTokens,
                }
              : {
                  prompt_tokens: promptTokens,
                  completion_tokens: completionTokens,
                  total_tokens: promptTokens + completionTokens,
                },
          };

          finalCostData = client.calculateCost(mockResponse, model);
          ({ totalCost } = finalCostData);
        }
      } else {
        // Fallback to manual calculation if client creation failed or doesn't have calculateCost
        const promptTokens = costData.promptTokens || costData.inputTokens || 0;
        const completionTokens = costData.completionTokens || costData.outputTokens || 0;

        if (
          provider === 'openai' ||
          provider === 'azure-openai' ||
          provider === 'openai-standard'
        ) {
          const defaultModel = providerUtils.getDefaultModel('openai');
          const pricing =
            PRICING.openai[model] ||
            PRICING.openai[defaultModel] ||
            PRICING.openai['gpt-4-turbo-preview'];
          const inputCost = (promptTokens / 1_000_000) * pricing.input;
          const outputCost = (completionTokens / 1_000_000) * pricing.output;
          totalCost = inputCost + outputCost;

          finalCostData = {
            ...costData,
            inputTokens: promptTokens,
            outputTokens: completionTokens,
            totalTokens: promptTokens + completionTokens,
            inputCost,
            outputCost,
            totalCost,
          };
        } else if (provider === 'claude') {
          const defaultModel = providerUtils.getDefaultModel('claude');
          const pricing =
            PRICING.claude[model] ||
            PRICING.claude[defaultModel] ||
            PRICING.claude['claude-sonnet-4-5-20250929'];
          const inputCost = (promptTokens / 1_000_000) * pricing.input;
          const outputCost = (completionTokens / 1_000_000) * pricing.output;
          totalCost = inputCost + outputCost;

          finalCostData = {
            ...costData,
            inputTokens: promptTokens,
            outputTokens: completionTokens,
            totalTokens: promptTokens + completionTokens,
            inputCost,
            outputCost,
            totalCost,
          };
        } else {
          totalCost = 0;
          finalCostData = {
            ...costData,
            inputTokens: promptTokens,
            outputTokens: completionTokens,
            totalTokens: promptTokens + completionTokens,
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
          };
        }
      }
    } else {
      // totalCost already provided, ensure costData structure is complete
      finalCostData = {
        ...costData,
        totalCost,
      };
    }

    const request = {
      timestamp: new Date().toISOString(),
      provider,
      model,
      ...finalCostData,
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
