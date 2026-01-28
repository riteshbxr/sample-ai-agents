/**
 * Logging Client Wrapper
 *
 * Wraps any AI client to add request/response logging for debugging,
 * auditing, and observability purposes.
 *
 * @example
 * import { createAIClient } from './client-factory.js';
 * import { LoggingClient } from './logging-client.js';
 *
 * const baseClient = createAIClient('openai');
 * const client = new LoggingClient(baseClient, {
 *   logRequests: true,
 *   logResponses: true,
 *   logErrors: true,
 *   redactKeys: ['apiKey', 'authorization'],
 * });
 *
 * // All requests/responses are now logged
 * const response = await client.chat(messages);
 */

import { AIClientInterface } from './ai-client-interface.js';
import { createLogger } from '../utils/logger.js';

/**
 * @typedef {Object} LoggingClientOptions
 * @property {boolean} [logRequests=true] - Log request details
 * @property {boolean} [logResponses=true] - Log response details
 * @property {boolean} [logErrors=true] - Log error details
 * @property {boolean} [logTiming=true] - Log request timing
 * @property {boolean} [truncateContent=true] - Truncate long content in logs
 * @property {number} [maxContentLength=500] - Max length before truncation
 * @property {string[]} [redactKeys=[]] - Keys to redact from logs
 * @property {Function} [onRequest] - Custom request handler
 * @property {Function} [onResponse] - Custom response handler
 * @property {Function} [onError] - Custom error handler
 */

/**
 * Logging wrapper for AI clients
 */
export class LoggingClient extends AIClientInterface {
  /**
   * Create a logging client wrapper
   * @param {AIClientInterface} client - Base client to wrap
   * @param {LoggingClientOptions} [options={}] - Configuration options
   */
  constructor(client, options = {}) {
    super();
    this.client = client;
    this.logger = createLogger('LoggingClient');

    // Configuration
    this.logRequests = options.logRequests ?? true;
    this.logResponses = options.logResponses ?? true;
    this.logErrors = options.logErrors ?? true;
    this.logTiming = options.logTiming ?? true;
    this.truncateContent = options.truncateContent ?? true;
    this.maxContentLength = options.maxContentLength ?? 500;
    this.redactKeys = new Set(options.redactKeys ?? ['apiKey', 'authorization', 'api_key']);

    // Custom handlers
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
    this.onError = options.onError;

    // Request counter
    this.requestCount = 0;
  }

  /**
   * Generate a unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    this.requestCount++;
    return `req_${Date.now()}_${this.requestCount}`;
  }

  /**
   * Truncate content if needed
   * @param {string} content - Content to potentially truncate
   * @returns {string} Truncated content
   */
  truncate(content) {
    if (!this.truncateContent || typeof content !== 'string') {
      return content;
    }
    if (content.length <= this.maxContentLength) {
      return content;
    }
    return `${content.substring(0, this.maxContentLength)}... [truncated ${content.length - this.maxContentLength} chars]`;
  }

  /**
   * Redact sensitive keys from an object
   * @param {Object} obj - Object to redact
   * @returns {Object} Redacted copy
   */
  redact(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item));
    }

    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.redactKeys.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = this.redact(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  /**
   * Summarize messages for logging
   * @param {Array} messages - Messages array
   * @returns {Object} Summary
   */
  summarizeMessages(messages) {
    if (!Array.isArray(messages)) return { count: 0 };

    return {
      count: messages.length,
      roles: messages.map((m) => m.role),
      lastMessage:
        messages.length > 0
          ? this.truncate(messages[messages.length - 1].content?.toString())
          : null,
    };
  }

  /**
   * Summarize response for logging
   * @param {Object} response - API response
   * @returns {Object} Summary
   */
  summarizeResponse(response) {
    const summary = {};

    if (response?.usage) {
      summary.tokens = {
        input: response.usage.prompt_tokens || response.usage.input_tokens,
        output: response.usage.completion_tokens || response.usage.output_tokens,
      };
    }

    const content = this.client.getTextContent(response);
    if (content) {
      summary.contentLength = content.length;
      summary.contentPreview = this.truncate(content);
    }

    if (this.client.hasToolUse(response)) {
      const tools = this.client.getToolUseBlocks(response);
      summary.toolCalls = tools.map((t) => t.function?.name || t.name);
    }

    return summary;
  }

  /**
   * Log a method call with timing
   * @param {string} method - Method name
   * @param {Function} fn - Async function to execute
   * @param {Object} [requestData={}] - Request data to log
   * @returns {Promise<any>} Function result
   */
  async loggedCall(method, fn, requestData = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Log request
    if (this.logRequests) {
      const logData = {
        requestId,
        method,
        ...this.redact(requestData),
      };
      this.logger.info(`Request: ${method}`, logData);

      if (this.onRequest) {
        this.onRequest(logData);
      }
    }

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      // Log response
      if (this.logResponses) {
        const logData = {
          requestId,
          method,
          durationMs: duration,
          response: this.summarizeResponse(result),
        };
        this.logger.info(`Response: ${method}`, logData);

        if (this.onResponse) {
          this.onResponse(logData, result);
        }
      } else if (this.logTiming) {
        this.logger.debug(`Completed: ${method}`, { requestId, durationMs: duration });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      if (this.logErrors) {
        const logData = {
          requestId,
          method,
          durationMs: duration,
          error: {
            message: error.message,
            status: error.status,
            code: error.code,
          },
        };
        this.logger.error(`Error: ${method}`, logData);

        if (this.onError) {
          this.onError(logData, error);
        }
      }

      throw error;
    }
  }

  // ============================================================
  // AIClientInterface implementation - delegate with logging
  // ============================================================

  async chat(messages, options = {}) {
    return this.loggedCall('chat', () => this.client.chat(messages, options), {
      messages: this.summarizeMessages(messages),
      options: this.redact(options),
    });
  }

  async chatStream(messages, onChunk, options = {}) {
    return this.loggedCall('chatStream', () => this.client.chatStream(messages, onChunk, options), {
      messages: this.summarizeMessages(messages),
      options: this.redact(options),
    });
  }

  async chatWithTools(messages, tools, options = {}) {
    return this.loggedCall(
      'chatWithTools',
      () => this.client.chatWithTools(messages, tools, options),
      {
        messages: this.summarizeMessages(messages),
        tools: tools.map((t) => t.name || t.function?.name),
        options: this.redact(options),
      }
    );
  }

  async chatWithFunctions(messages, functions, options = {}) {
    return this.loggedCall(
      'chatWithFunctions',
      () => this.client.chatWithFunctions(messages, functions, options),
      {
        messages: this.summarizeMessages(messages),
        functions: functions.map((f) => f.name),
        options: this.redact(options),
      }
    );
  }

  async getEmbeddings(input, embeddingModel = null) {
    const inputSummary = Array.isArray(input)
      ? { count: input.length, sample: this.truncate(input[0]) }
      : { text: this.truncate(input) };

    return this.loggedCall(
      'getEmbeddings',
      () => this.client.getEmbeddings(input, embeddingModel),
      { input: inputSummary, embeddingModel }
    );
  }

  async analyzeImage(imageBase64, prompt, options = {}) {
    return this.loggedCall(
      'analyzeImage',
      () => this.client.analyzeImage(imageBase64, prompt, options),
      {
        imageSize: imageBase64.length,
        prompt: this.truncate(prompt),
        options: this.redact(options),
      }
    );
  }

  async createAssistant(instructions, tools = [], options = {}) {
    return this.loggedCall(
      'createAssistant',
      () => this.client.createAssistant(instructions, tools, options),
      {
        instructionsLength: instructions.length,
        toolCount: tools.length,
        options: this.redact(options),
      }
    );
  }

  async createThread() {
    return this.loggedCall('createThread', () => this.client.createThread());
  }

  async addMessage(threadId, content, role = 'user') {
    return this.loggedCall('addMessage', () => this.client.addMessage(threadId, content, role), {
      threadId,
      contentLength: content.length,
      role,
    });
  }

  async getMessages(threadId, options = {}) {
    return this.loggedCall('getMessages', () => this.client.getMessages(threadId, options), {
      threadId,
      options: this.redact(options),
    });
  }

  async runAssistant(threadId, assistantId, options = {}) {
    return this.loggedCall(
      'runAssistant',
      () => this.client.runAssistant(threadId, assistantId, options),
      { threadId, assistantId, options: this.redact(options) }
    );
  }

  async retrieveRun(threadId, runId) {
    return this.loggedCall('retrieveRun', () => this.client.retrieveRun(threadId, runId), {
      threadId,
      runId,
    });
  }

  // Passthrough methods (no logging needed)
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
