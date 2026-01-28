import { AIClientInterface } from './ai-client-interface.js';
import { estimateTokens } from '../utils/token-utils.js';
import { PRICING } from '../utils/pricing.js';
import { config } from '../config.js';

/**
 * Cost Tracking Client
 * Wraps any AI client and automatically tracks token usage and costs
 *
 * @example
 * import { createAIClient } from './client-factory.js';
 * import { CostTrackingClient } from './cost-tracking-client.js';
 *
 * const baseClient = createAIClient('openai');
 * const trackedClient = new CostTrackingClient(baseClient);
 *
 * // Use normally - costs are tracked automatically
 * const response = await trackedClient.chat([{ role: 'user', content: 'Hello' }]);
 *
 * // Get cost statistics
 * const stats = trackedClient.getStats();
 * console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);
 */
export class CostTrackingClient extends AIClientInterface {
  /**
   * @param {AIClientInterface} client - The AI client to wrap and track
   * @param {Object} [options={}] - Options for cost tracking
   * @param {boolean} [options.autoTrack=true] - Automatically track all requests
   * @param {Function} [options.onRequestTracked] - Callback when a request is tracked
   */
  constructor(client, options = {}) {
    super();
    this.client = client;
    this.autoTrack = options.autoTrack !== false;
    this.onRequestTracked = options.onRequestTracked;

    // Cost tracking state
    this.requests = [];
    this.totalCost = 0;

    // Determine provider from client
    this.provider = this._detectProvider(client);
  }

  /**
   * Detect provider from client
   * @private
   */
  _detectProvider(client) {
    if (client.constructor.name.includes('OpenAI') || client.constructor.name.includes('Azure')) {
      return 'openai';
    }
    if (client.constructor.name.includes('Claude')) {
      return 'claude';
    }
    // Try to get from model or config
    if (client.model) {
      if (client.model.includes('gpt') || client.model.includes('text-')) {
        return 'openai';
      }
      if (client.model.includes('claude')) {
        return 'claude';
      }
    }
    return 'unknown';
  }

  /**
   * Estimate tokens (using utility function)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    return estimateTokens(text);
  }

  /**
   * Calculate cost from response using the wrapped client's calculateCost method
   * @param {Object} response - API response
   * @param {string} [model] - Optional model name (defaults to client model)
   * @returns {Object} Cost calculation result
   */
  calculateCost(response, model = null) {
    // Use the client's calculateCost method if available
    if (this.client && typeof this.client.calculateCost === 'function') {
      return this.client.calculateCost(response, model);
    }

    // Fallback for clients that don't have calculateCost method
    // Unknown provider - return zero cost
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };
  }

  /**
   * Track a request
   * @param {string} provider - Provider name
   * @param {string} model - Model name
   * @param {Object} costData - Cost data
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {Object} Tracked request
   */
  trackRequest(provider, model, costData, metadata = {}) {
    // Calculate cost if not provided
    let { totalCost } = costData;
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

    // Call callback if provided
    if (this.onRequestTracked) {
      this.onRequestTracked(request, this.getStats());
    }

    return request;
  }

  /**
   * Get statistics
   * @returns {Object} Cost statistics
   */
  getStats() {
    const stats = {
      totalRequests: this.requests.length,
      totalCost: this.totalCost,
      totalTokens: this.requests.reduce((sum, r) => sum + (r.totalTokens || 0), 0),
      byProvider: {},
      byModel: {},
    };

    this.requests.forEach((req) => {
      // By provider
      if (!stats.byProvider[req.provider]) {
        stats.byProvider[req.provider] = { count: 0, cost: 0, tokens: 0 };
      }
      stats.byProvider[req.provider].count++;
      stats.byProvider[req.provider].cost += req.totalCost || 0;
      stats.byProvider[req.provider].tokens += req.totalTokens || 0;

      // By model
      if (!stats.byModel[req.model]) {
        stats.byModel[req.model] = { count: 0, cost: 0, tokens: 0 };
      }
      stats.byModel[req.model].count++;
      stats.byModel[req.model].cost += req.totalCost || 0;
      stats.byModel[req.model].tokens += req.totalTokens || 0;
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

  /**
   * Reset tracking data
   */
  reset() {
    this.requests = [];
    this.totalCost = 0;
  }

  // ========== AI Client Interface Implementation ==========

  /**
   * @inheritDoc
   */
  async chat(messages, options = {}) {
    const response = await this.client.chat(messages, options);

    if (this.autoTrack) {
      const model = this.client.model || config.openai.model || config.claude.model;
      const costData = this.calculateCost(response, model);
      this.trackRequest(this.provider, model, costData, {
        requestType: 'chat',
        messages: messages.length,
      });
    }

    return response;
  }

  /**
   * @inheritDoc
   */
  async chatStream(messages, onChunk, options = {}) {
    // For streaming, we need to track tokens differently
    // We'll estimate from the full response
    let fullResponse = '';
    const streamOnChunk = (chunk) => {
      fullResponse += chunk;
      if (onChunk) {
        onChunk(chunk);
      }
    };

    await this.client.chatStream(messages, streamOnChunk, options);

    if (this.autoTrack) {
      const model = this.client.model || config.openai.model || config.claude.model;
      // Estimate tokens for streaming (approximate)
      const inputTokens = this.estimateTokens(messages.map((m) => m.content).join(' '));
      const outputTokens = this.estimateTokens(fullResponse);
      const costData = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      };
      this.trackRequest(this.provider, model, costData, {
        requestType: 'chatStream',
        messages: messages.length,
      });
    }

    return fullResponse;
  }

  /**
   * @inheritDoc
   */
  async chatWithTools(messages, tools, options = {}) {
    const response = await this.client.chatWithTools(messages, tools, options);

    if (this.autoTrack) {
      const model = this.client.model || config.openai.model || config.claude.model;
      const costData = this.calculateCost(response, model);
      this.trackRequest(this.provider, model, costData, {
        requestType: 'chatWithTools',
        messages: messages.length,
        toolsCount: tools.length,
      });
    }

    return response;
  }

  /**
   * @inheritDoc
   */
  getTextContent(response) {
    return this.client.getTextContent(response);
  }

  /**
   * @inheritDoc
   */
  hasToolUse(response) {
    return this.client.hasToolUse(response);
  }

  /**
   * @inheritDoc
   */
  getToolUseBlocks(response) {
    return this.client.getToolUseBlocks(response);
  }

  /**
   * @inheritDoc
   */
  async getEmbeddings(input, embeddingModel = null) {
    const embeddings = await this.client.getEmbeddings(input, embeddingModel);

    if (this.autoTrack) {
      const model = embeddingModel || this.client.model || 'text-embedding-ada-002';
      const inputArray = Array.isArray(input) ? input : [input];
      const totalTokens = inputArray.reduce((sum, text) => sum + this.estimateTokens(text), 0);

      // Embeddings typically have fixed pricing
      const pricing = PRICING.openai[model] ||
        PRICING.openai['text-embedding-ada-002'] || { input: 0.1, output: 0 };
      const cost = (totalTokens / 1_000_000) * pricing.input;

      this.trackRequest(
        this.provider,
        model,
        {
          inputTokens: totalTokens,
          outputTokens: 0,
          totalTokens,
          totalCost: cost,
        },
        {
          requestType: 'embeddings',
          embeddingsCount: embeddings.length,
        }
      );
    }

    return embeddings;
  }

  /**
   * @inheritDoc
   */
  async analyzeImage(imageBase64, prompt, options = {}) {
    const result = await this.client.analyzeImage(imageBase64, prompt, options);

    if (this.autoTrack) {
      const model = this.client.model || config.openai.visionModel || config.openai.model;
      // Estimate tokens for vision (approximate)
      const promptTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(result);
      const costData = {
        inputTokens: promptTokens + 1000, // Approximate image tokens
        outputTokens,
        totalTokens: promptTokens + 1000 + outputTokens,
      };
      this.trackRequest(this.provider, model, costData, {
        requestType: 'analyzeImage',
      });
    }

    return result;
  }

  /**
   * @inheritDoc
   */
  async createAssistant(instructions, tools = [], options = {}) {
    return this.client.createAssistant(instructions, tools, options);
  }

  /**
   * @inheritDoc
   */
  async createThread() {
    return this.client.createThread();
  }

  /**
   * @inheritDoc
   */
  async addMessage(threadId, content, role = 'user') {
    return this.client.addMessage(threadId, content, role);
  }

  /**
   * @inheritDoc
   */
  async getMessages(threadId, options = {}) {
    return this.client.getMessages(threadId, options);
  }

  /**
   * @inheritDoc
   */
  async runAssistant(threadId, assistantId, options = {}) {
    return this.client.runAssistant(threadId, assistantId, options);
  }

  /**
   * @inheritDoc
   */
  async retrieveRun(threadId, runId) {
    return this.client.retrieveRun(threadId, runId);
  }

  // Expose client properties
  get model() {
    return this.client.model;
  }
}
