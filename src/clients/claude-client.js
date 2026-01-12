import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { AIClientInterface } from './ai-client-interface.js';
import { PRICING } from '../utils/pricing.js';

/**
 * Claude Client
 * Implements AIClientInterface for consistent API across providers
 */
export class ClaudeClient extends AIClientInterface {
  constructor(model = null) {
    super();
    if (!config.claude.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }

    this.client = new Anthropic({
      apiKey: config.claude.apiKey,
      apiVersion: config.claude.apiVersion,
    });
    this.model = model || config.claude.model;
  }

  /**
   * Extract system messages from messages array and convert to Claude format
   * Claude API requires system content as a top-level parameter, not as a message role
   * @param {Array} messages - Array of message objects
   * @returns {Object} Object with filteredMessages (without system) and systemContent (combined system messages)
   */
  extractSystemMessages(messages) {
    const systemMessages = [];
    const filteredMessages = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // Extract content from system message
        // Handle both string content and structured content
        let content = '';
        if (typeof message.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          // Handle array of content blocks (e.g., text blocks)
          content = message.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n');
        } else if (message.content?.text) {
          content = message.content.text;
        }
        if (content) {
          systemMessages.push(content);
        }
      } else {
        filteredMessages.push(message);
      }
    }

    // Combine multiple system messages with newlines
    const systemContent = systemMessages.length > 0 ? systemMessages.join('\n\n') : null;

    return {
      filteredMessages,
      systemContent,
    };
  }

  /**
   * Basic chat completion
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<Object>} Message response
   */
  async chat(messages, options = {}) {
    // Extract system messages and convert to top-level system parameter
    // Claude API doesn't accept "system" as a message role
    const { filteredMessages, systemContent } = this.extractSystemMessages(messages);

    // Use system from options if provided, otherwise use extracted system content
    const systemParam = options.system || systemContent;

    // Claude doesn't support response_format parameter - remove it if present
    const { response_format, ...claudeOptions } = options;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.max_tokens || 4096,
      messages: filteredMessages,
      ...(systemParam && { system: systemParam }),
      ...claudeOptions,
    });
    return response;
  }

  /**
   * Streaming chat completion - Latest trend for real-time UX
   * @param {Array} messages - Array of message objects
   * @param {Function} onChunk - Callback function for each chunk
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Full response text
   */
  async chatStream(messages, onChunk = null, options = {}) {
    // Extract system messages and convert to top-level system parameter
    // Claude API doesn't accept "system" as a message role
    const { filteredMessages, systemContent } = this.extractSystemMessages(messages);

    // Use system from options if provided, otherwise use extracted system content
    const systemParam = options.system || systemContent;

    // Claude doesn't support response_format parameter - remove it if present
    const { response_format, ...claudeOptions } = options;

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: options.max_tokens || 4096,
      messages: filteredMessages,
      ...(systemParam && { system: systemParam }),
      ...claudeOptions,
    });

    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const content = event.delta.text || '';
        if (content) {
          fullText += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }
    }
    return fullText;
  }

  /**
   * Tool use (function calling) - Latest trend for tool use
   * @param {Array} messages - Array of message objects
   * @param {Array} tools - Array of tool definitions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with tool use
   */
  async chatWithTools(messages, tools, options = {}) {
    // Extract system messages and convert to top-level system parameter
    // Claude API doesn't accept "system" as a message role
    const { filteredMessages, systemContent } = this.extractSystemMessages(messages);

    // Convert OpenAI function format to Claude tool format if needed
    const claudeTools = tools.map((tool) => {
      // If already in Claude format, use as-is
      if (tool.input_schema) {
        return tool;
      }
      // If in OpenAI function format, convert
      if (tool.function) {
        return {
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters,
        };
      }
      // If it's a plain function definition, convert
      if (tool.parameters) {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters,
        };
      }
      // Otherwise assume it's already in Claude format
      return tool;
    });

    // Use system from options if provided, otherwise use extracted system content
    const systemParam = options.system || systemContent;

    // Claude doesn't support response_format parameter - remove it if present
    const { response_format, ...claudeOptions } = options;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.max_tokens || 4096,
      messages: filteredMessages,
      tools: claudeTools,
      ...(systemParam && { system: systemParam }),
      ...claudeOptions,
    });

    return response;
  }

  /**
   * Function calling - Alias for chatWithTools for backward compatibility
   * @param {Array} messages - Array of message objects
   * @param {Array} functions - Array of function definitions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with tool use
   */
  async chatWithFunctions(messages, functions, options = {}) {
    return this.chatWithTools(messages, functions, options);
  }

  /**
   * Get message content from response
   * @param {Object} response - Claude API response
   * @returns {string} Text content
   */
  getTextContent(response) {
    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock ? textBlock.text : '';
  }

  /**
   * Check if response contains tool use
   * @param {Object} response - Claude API response
   * @returns {boolean} True if response contains tool use
   */
  hasToolUse(response) {
    return response.content.some((block) => block.type === 'tool_use');
  }

  /**
   * Get tool use blocks from response
   * @param {Object} response - Claude API response
   * @returns {Array} Array of tool use blocks
   */
  getToolUseBlocks(response) {
    return response.content.filter((block) => block.type === 'tool_use');
  }

  /**
   * Get embeddings for RAG
   * Note: Claude doesn't have a native embeddings API
   * This method throws an error to indicate embeddings are not supported
   * @param {string|Array} input - Text or array of texts to embed
   * @param {string} embeddingModel - Optional embedding model name (ignored)
   * @returns {Promise<Array>} Embedding vectors
   * @throws {Error} Claude doesn't support embeddings directly
   */
  async getEmbeddings(_input, _embeddingModel = null) {
    throw new Error(
      'Claude does not support embeddings. Please use OpenAI for embeddings or a third-party embeddings service.'
    );
  }

  /**
   * Analyze an image with a text prompt
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} prompt - Text prompt for analysis
   * @param {Object} options - Additional options (max_tokens, etc.)
   * @returns {Promise<string>} Analysis result
   */
  async analyzeImage(imageBase64, prompt, options = {}) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.max_tokens || 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      ...options,
    });

    return this.getTextContent(response);
  }

  /**
   * Create an assistant
   * Note: Claude doesn't support OpenAI Assistants API
   * @throws {Error} Claude doesn't support assistants
   */
  async createAssistant(_instructions, _tools = [], _options = {}) {
    throw new Error(
      'Claude does not support OpenAI Assistants API. Please use OpenAI for assistants functionality.'
    );
  }

  /**
   * Create a thread
   * Note: Claude doesn't support OpenAI Assistants API
   * @throws {Error} Claude doesn't support assistants
   */
  async createThread() {
    throw new Error(
      'Claude does not support OpenAI Assistants API. Please use OpenAI for assistants functionality.'
    );
  }

  /**
   * Add message to thread
   * Note: Claude doesn't support OpenAI Assistants API
   * @throws {Error} Claude doesn't support assistants
   */
  async addMessage(_threadId, _content, _role = 'user') {
    throw new Error(
      'Claude does not support OpenAI Assistants API. Please use OpenAI for assistants functionality.'
    );
  }

  /**
   * Get messages from thread
   * Note: Claude doesn't support OpenAI Assistants API
   * @throws {Error} Claude doesn't support assistants
   */
  async getMessages(_threadId, _options = {}) {
    throw new Error(
      'Claude does not support OpenAI Assistants API. Please use OpenAI for assistants functionality.'
    );
  }

  /**
   * Run assistant on thread
   * Note: Claude doesn't support OpenAI Assistants API
   * @throws {Error} Claude doesn't support assistants
   */
  async runAssistant(_threadId, _assistantId, _options = {}) {
    throw new Error(
      'Claude does not support OpenAI Assistants API. Please use OpenAI for assistants functionality.'
    );
  }

  /**
   * Retrieve run status
   * Note: Claude doesn't support OpenAI Assistants API
   * @throws {Error} Claude doesn't support assistants
   */
  async retrieveRun(_threadId, _runId) {
    throw new Error(
      'Claude does not support OpenAI Assistants API. Please use OpenAI for assistants functionality.'
    );
  }

  /**
   * Calculate cost for Claude response
   * @param {Object} response - Claude API response with usage information
   * @param {string} [model] - Optional model name (defaults to client model)
   * @returns {Object} Cost calculation result with inputTokens, outputTokens, totalTokens, inputCost, outputCost, totalCost
   */
  calculateCost(response, model = null) {
    const usage = response.usage;
    if (!usage) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
      };
    }

    const modelName = model || this.model;
    const defaultModel = config.claude.model;
    const pricing =
      PRICING.claude[modelName] ||
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
}
