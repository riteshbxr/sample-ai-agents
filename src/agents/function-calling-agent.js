import { createAIClient } from '../clients/client-factory.js';
import { createLogger } from '../utils/logger.js';

/**
 * @typedef {Object} FunctionDefinition
 * @property {string} name - Function name
 * @property {string} description - Function description
 * @property {Object} parameters - JSON schema for parameters
 * @property {Function} implementation - Function implementation
 */

/**
 * Function Calling Agent - Can use tools/functions to perform actions
 * Supports both OpenAI and Claude
 */
export class FunctionCallingAgent {
  /**
   * Create a function calling agent
   * @param {'openai'|'claude'} [provider='openai'] - AI provider to use
   */
  constructor(provider = 'openai') {
    this.provider = provider;
    /** @type {Map<string, Function>} */
    this.functions = new Map(); // Store function implementations
    /** @type {Array<Object>} */
    this.functionDefinitions = []; // Store function schemas
    /** @type {import('../clients/ai-client-interface.js').ChatMessage[]} */
    this.conversationHistory = [];
    this.client = createAIClient(provider);
    this.logger = createLogger('FunctionCallingAgent');
  }

  /**
   * Register a function that the agent can call
   * @param {string} name - Function name
   * @param {string} description - Function description
   * @param {Object} parameters - JSON schema for parameters
   * @param {Function} implementation - Function implementation
   */
  registerFunction(name, description, parameters, implementation) {
    this.logger.info('Function registered', { name, description });
    this.functions.set(name, implementation);

    if (this.provider === 'openai') {
      this.functionDefinitions.push({
        name,
        description,
        parameters,
      });
    } else if (this.provider === 'claude') {
      this.functionDefinitions.push({
        name,
        description,
        input_schema: parameters,
      });
    }
  }

  /**
   * Execute a function call
   * @param {string} name - Function name
   * @param {Object} args - Function arguments
   * @returns {Promise<any>} Function result
   */
  async executeFunction(name, args) {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function ${name} not found`);
    }

    try {
      const result = await func(args);
      return result;
    } catch (error) {
      console.error(`Error executing function ${name}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Chat with function calling capability
   * @param {string} userMessage - User's message
   * @param {Object} options - Additional options
   * @param {number} [options.maxToolCallIterations=50] - Maximum number of tool call iterations to prevent infinite loops
   * @returns {Promise<string>} Agent's response
   */
  async chat(userMessage, options = {}) {
    const client = this.client;
    const maxIterations = options.maxToolCallIterations || 50;

    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Loop until we get a final response without tool calls
    let iterationCount = 0;
    while (iterationCount < maxIterations) {
      iterationCount++;

      // Use unified interface method
      let response = await client.chatWithTools(
        this.conversationHistory,
        this.functionDefinitions,
        options
      );

      // Handle tool use using interface methods
      if (client.hasToolUse(response)) {
        const toolUseBlocks = client.getToolUseBlocks(response);

        // Execute all tool calls
        const toolResults = [];

        for (const block of toolUseBlocks) {
          let functionName, functionArgs;

          // Handle OpenAI format (tool_calls)
          if (block.function) {
            functionName = block.function.name;
            functionArgs = JSON.parse(block.function.arguments);
          }
          // Handle Claude format (tool_use)
          else {
            functionName = block.name;
            functionArgs = block.input;
          }

          console.log(`Calling function: ${functionName}`, functionArgs);
          const result = await this.executeFunction(functionName, functionArgs);

          // Format tool result based on provider
          if (this.provider === 'openai') {
            toolResults.push({
              role: 'tool',
              tool_call_id: block.id,
              content: JSON.stringify(result),
            });
          } else {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        // Add assistant message and tool results to conversation
        if (this.provider === 'openai') {
          // OpenAI format: add message with tool_calls, then tool results
          const message = response.choices?.[0]?.message || {
            role: 'assistant',
            content: client.getTextContent(response),
          };
          this.conversationHistory.push(message);
          this.conversationHistory.push(...toolResults);
        } else {
          // Claude format: add assistant content, then user with tool results
          this.conversationHistory.push({
            role: 'assistant',
            content: response.content,
          });
          this.conversationHistory.push({
            role: 'user',
            content: toolResults,
          });
        }

        // Continue loop to check for more tool calls
        continue;
      }

      // No tool use - return text content
      const textContent = client.getTextContent(response);

      // Add response to conversation
      if (this.provider === 'openai') {
        const message = response.choices?.[0]?.message || {
          role: 'assistant',
          content: textContent,
        };
        this.conversationHistory.push(message);
      } else {
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });
      }

      return textContent;
    }

    // If we've exceeded max iterations, throw an error
    throw new Error(
      `Maximum tool call iterations (${maxIterations}) exceeded. This may indicate an infinite loop in function calling.`
    );
  }

  /**
   * Reset conversation history
   */
  resetConversation() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getConversationHistory() {
    return this.conversationHistory;
  }
}
