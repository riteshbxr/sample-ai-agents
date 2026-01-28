/**
 * Resilient AI Client Wrapper
 *
 * Wraps any AI client with retry logic, circuit breaker, and rate limiting.
 * Use this in production to handle transient failures gracefully.
 *
 * @example
 * import { createAIClient } from './client-factory.js';
 * import { ResilientClient } from './resilient-client.js';
 *
 * const baseClient = createAIClient('openai');
 * const client = new ResilientClient(baseClient, {
 *   maxRetries: 3,
 *   baseDelayMs: 1000,
 *   maxDelayMs: 30000,
 * });
 *
 * // Use normally - retries are automatic
 * const response = await client.chat(messages);
 */

import { AIClientInterface } from './ai-client-interface.js';
import { createLogger } from '../utils/logger.js';

/**
 * @typedef {Object} ResilientClientOptions
 * @property {number} [maxRetries=3] - Maximum retry attempts
 * @property {number} [baseDelayMs=1000] - Base delay for exponential backoff
 * @property {number} [maxDelayMs=30000] - Maximum delay between retries
 * @property {number} [jitterFactor=0.3] - Random jitter factor (0-1)
 * @property {number} [circuitBreakerThreshold=5] - Failures before opening circuit
 * @property {number} [circuitBreakerTimeoutMs=60000] - Time before half-open state
 */

/**
 * Resilient wrapper for AI clients with retry and circuit breaker patterns
 */
export class ResilientClient extends AIClientInterface {
  /**
   * Create a resilient client wrapper
   * @param {AIClientInterface} client - Base client to wrap
   * @param {ResilientClientOptions} [options={}] - Configuration options
   */
  constructor(client, options = {}) {
    super();
    this.client = client;
    this.logger = createLogger('ResilientClient');

    // Retry configuration
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.jitterFactor = options.jitterFactor ?? 0.3;

    // Circuit breaker configuration
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitBreakerTimeoutMs = options.circuitBreakerTimeoutMs ?? 60000;

    // Circuit breaker state
    this.failureCount = 0;
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttemptTime = 0;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      circuitBreakerTrips: 0,
    };
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryableError(error) {
    // Rate limit errors
    if (error.status === 429) return true;

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) return true;

    // Network errors
    if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'].includes(error.code)) {
      return true;
    }

    // OpenAI specific
    if (error.message?.toLowerCase().includes('rate limit')) return true;
    if (error.message?.toLowerCase().includes('timeout')) return true;

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number (1-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    const jitter = cappedDelay * this.jitterFactor * Math.random();
    return Math.round(cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check and update circuit breaker state
   * @throws {Error} If circuit is open
   */
  checkCircuitBreaker() {
    if (this.circuitState === 'OPEN') {
      if (Date.now() >= this.nextAttemptTime) {
        this.circuitState = 'HALF_OPEN';
        this.logger.info('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Retry after ${Math.ceil((this.nextAttemptTime - Date.now()) / 1000)}s`
        );
      }
    }
  }

  /**
   * Record successful request
   */
  onSuccess() {
    this.failureCount = 0;
    this.circuitState = 'CLOSED';
    this.metrics.successfulRequests++;
  }

  /**
   * Record failed request
   */
  onFailure() {
    this.failureCount++;
    this.metrics.failedRequests++;

    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitState = 'OPEN';
      this.nextAttemptTime = Date.now() + this.circuitBreakerTimeoutMs;
      this.metrics.circuitBreakerTrips++;
      this.logger.warn('Circuit breaker OPEN', {
        failures: this.failureCount,
        retryAfterMs: this.circuitBreakerTimeoutMs,
      });
    }
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Function result
   */
  async withRetry(fn) {
    this.metrics.totalRequests++;
    this.checkCircuitBreaker();

    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        const result = await fn();
        this.onSuccess();
        return result;
      } catch (error) {
        lastError = error;

        if (attempt > this.maxRetries || !this.isRetryableError(error)) {
          this.onFailure();
          throw error;
        }

        this.metrics.retriedRequests++;
        const delay = this.calculateDelay(attempt);

        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: error.message,
          status: error.status,
        });

        await this.sleep(delay);
      }
    }

    this.onFailure();
    throw lastError;
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      successRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
          : 100,
    };
  }

  /**
   * Reset metrics and circuit breaker state
   */
  reset() {
    this.failureCount = 0;
    this.circuitState = 'CLOSED';
    this.nextAttemptTime = 0;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      circuitBreakerTrips: 0,
    };
  }

  // ============================================================
  // AIClientInterface implementation - delegate to wrapped client
  // ============================================================

  async chat(messages, options = {}) {
    return this.withRetry(() => this.client.chat(messages, options));
  }

  async chatStream(messages, onChunk, options = {}) {
    return this.withRetry(() => this.client.chatStream(messages, onChunk, options));
  }

  async chatWithTools(messages, tools, options = {}) {
    return this.withRetry(() => this.client.chatWithTools(messages, tools, options));
  }

  async chatWithFunctions(messages, functions, options = {}) {
    return this.withRetry(() => this.client.chatWithFunctions(messages, functions, options));
  }

  async getEmbeddings(input, embeddingModel = null) {
    return this.withRetry(() => this.client.getEmbeddings(input, embeddingModel));
  }

  async analyzeImage(imageBase64, prompt, options = {}) {
    return this.withRetry(() => this.client.analyzeImage(imageBase64, prompt, options));
  }

  async createAssistant(instructions, tools = [], options = {}) {
    return this.withRetry(() => this.client.createAssistant(instructions, tools, options));
  }

  async createThread() {
    return this.withRetry(() => this.client.createThread());
  }

  async addMessage(threadId, content, role = 'user') {
    return this.withRetry(() => this.client.addMessage(threadId, content, role));
  }

  async getMessages(threadId, options = {}) {
    return this.withRetry(() => this.client.getMessages(threadId, options));
  }

  async runAssistant(threadId, assistantId, options = {}) {
    return this.withRetry(() => this.client.runAssistant(threadId, assistantId, options));
  }

  async retrieveRun(threadId, runId) {
    return this.withRetry(() => this.client.retrieveRun(threadId, runId));
  }

  // Passthrough methods (no retry needed)
  getTextContent(response) {
    return this.client.getTextContent(response);
  }

  hasToolUse(response) {
    return this.client.hasToolUse(response);
  }

  getToolUseBlocks(response) {
    return this.client.getToolUseBlocks(response);
  }

  calculateCost(response, model = null) {
    return this.client.calculateCost(response, model);
  }
}
