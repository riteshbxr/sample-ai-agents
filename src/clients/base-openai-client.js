/**
 * Base OpenAI Client
 *
 * Shared implementation for OpenAI-compatible clients (Standard and Azure).
 * Contains common response parsing and cost calculation logic.
 */

import { AIClientInterface } from './ai-client-interface.js';
import { PRICING } from '../utils/pricing.js';
import { config } from '../config.js';

/**
 * Base class for OpenAI-compatible clients
 * @extends {AIClientInterface}
 */
export class BaseOpenAIClient extends AIClientInterface {
  constructor() {
    super();
    /** @type {import('openai').OpenAI} */
    this.client = null;
    /** @type {string} */
    this.model = null;
    /** @type {boolean} */
    this.isAzure = false;
  }

  /**
   * Get text content from OpenAI response
   * @param {Object} response - OpenAI API response
   * @returns {string} Text content
   */
  getTextContent(response) {
    return response?.choices?.[0]?.message?.content || '';
  }

  /**
   * Check if OpenAI response contains tool calls
   * @param {Object} response - OpenAI API response
   * @returns {boolean} True if response contains tool calls
   */
  hasToolUse(response) {
    const toolCalls = response?.choices?.[0]?.message?.tool_calls;
    return Array.isArray(toolCalls) && toolCalls.length > 0;
  }

  /**
   * Get tool call blocks from OpenAI response
   * @param {Object} response - OpenAI API response
   * @returns {Array} Array of tool call objects
   */
  getToolUseBlocks(response) {
    return response?.choices?.[0]?.message?.tool_calls || [];
  }

  /**
   * Chat with tools - Unified interface method
   * @param {Array} messages - Array of message objects
   * @param {Array} tools - Array of tool/function definitions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with tool calls
   */
  async chatWithTools(messages, tools, options = {}) {
    // Convert tools to OpenAI function format if needed
    const functions = tools.map((tool) => {
      // If already in OpenAI format, use as-is
      if (tool.function) {
        return tool.function;
      }
      // If in Claude format, convert
      if (tool.input_schema) {
        return {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        };
      }
      // Otherwise assume it's already a function definition
      return tool;
    });

    return this.chatWithFunctions(messages, functions, options);
  }

  /**
   * Calculate cost for OpenAI response
   * @param {Object} response - OpenAI API response with usage information
   * @param {string} [model] - Optional model name (defaults to client model)
   * @returns {Object} Cost calculation result
   */
  calculateCost(response, model = null) {
    const { usage } = response;
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
    const pricing =
      PRICING.openai[modelName] ||
      PRICING.openai[config.openai.model] ||
      PRICING.openai['gpt-4-turbo-preview'];

    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;

    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }
}
