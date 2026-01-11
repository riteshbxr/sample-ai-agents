import { OpenAI } from 'openai';
import { config } from '../config.js';
import { AIClientInterface } from './ai-client-interface.js';

/**
 * Standard OpenAI Client (Non-Azure)
 * Implements AIClientInterface for consistent API across providers
 * This client is specifically for OpenAI's direct API, not Azure OpenAI
 *
 * @extends {AIClientInterface}
 */
export class StandardOpenAIClient extends AIClientInterface {
  /**
   * Create Standard OpenAI client instance
   * @param {string} [model] - Optional model name (overrides config)
   */
  constructor(model = null) {
    super();

    // Use OPENAI_API_KEY specifically (not AZURE_OPENAI_API_KEY)
    const apiKey = config.openai.standardApiKey;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set in environment variables. Standard OpenAI requires OPENAI_API_KEY (not AZURE_OPENAI_API_KEY).'
      );
    }

    // Standard OpenAI configuration (no Azure endpoint)
    this.model = model || config.openai.model || 'gpt-4-turbo-preview';
    this.isAzure = false;

    this.client = new OpenAI({
      apiKey,
    });
  }

  /**
   * Basic chat completion
   * @param {import('./ai-client-interface.js').ChatMessage[]} messages - Array of message objects with role and content
   * @param {import('./ai-client-interface.js').ChatOptions} [options={}] - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<import('./ai-client-interface.js').ChatResponse>} Chat completion response
   */
  async chat(messages, options = {}) {
    const requestOptions = {
      model: this.model,
      messages,
      ...options,
    };

    const response = await this.client.chat.completions.create(requestOptions);
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
    const requestOptions = {
      model: this.model,
      messages,
      stream: true,
      ...options,
    };

    const stream = await this.client.chat.completions.create(requestOptions);

    let fullText = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        if (onChunk) {
          onChunk(content);
        }
      }
    }
    return fullText;
  }

  /**
   * Function calling - Latest trend for tool use
   * @param {Array} messages - Array of message objects
   * @param {Array} functions - Array of function definitions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with function calls
   */
  async chatWithFunctions(messages, functions, options = {}) {
    const tools = functions.map((func) => ({
      type: 'function',
      function: func,
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools,
      tool_choice: 'auto',
      ...options,
    });

    return response;
  }

  /**
   * Chat with tools - Unified interface method
   * Wraps chatWithFunctions for consistency with Claude client
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
   * Create an OpenAI Assistant (for persistent AI agents)
   * Note: Assistants API is only available with standard OpenAI, not Azure OpenAI
   * @param {string} instructions - System instructions for the assistant
   * @param {Array} tools - Tools/functions the assistant can use
   * @returns {Promise<Object>} Assistant object
   */
  async createAssistant(instructions, tools = []) {
    const assistant = await this.client.beta.assistants.create({
      name: 'AI Agent',
      instructions,
      model: this.model,
      tools,
    });
    return assistant;
  }

  /**
   * Create a thread for assistant conversations
   * Note: Assistants API is only available with standard OpenAI, not Azure OpenAI
   * @returns {Promise<Object>} Thread object
   */
  async createThread() {
    const thread = await this.client.beta.threads.create();
    return thread;
  }

  /**
   * Run assistant on a thread
   * Note: Assistants API is only available with standard OpenAI, not Azure OpenAI
   * @param {string} threadId - Thread ID
   * @param {string} assistantId - Assistant ID
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} Run object
   */
  async runAssistant(threadId, assistantId, userMessage) {
    // Add message to thread
    await this.client.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userMessage,
    });

    // Run the assistant
    const run = await this.client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    return run;
  }

  /**
   * Get embeddings for RAG
   * @param {string|Array} input - Text or array of texts to embed
   * @param {string} embeddingModel - Optional embedding model name
   * @returns {Promise<Array>} Embedding vectors
   */
  async getEmbeddings(input, embeddingModel = null) {
    const model = embeddingModel || 'text-embedding-3-small';

    const response = await this.client.embeddings.create({
      model,
      input: Array.isArray(input) ? input : [input],
    });
    return response.data.map((item) => item.embedding);
  }

  /**
   * Get text content from OpenAI response
   * @param {Object} response - OpenAI API response
   * @returns {string} Text content
   */
  getTextContent(response) {
    // OpenAI response format: response.choices[0].message.content
    if (response.choices && response.choices[0] && response.choices[0].message) {
      return response.choices[0].message.content || '';
    }
    return '';
  }

  /**
   * Check if OpenAI response contains tool calls
   * @param {Object} response - OpenAI API response
   * @returns {boolean} True if response contains tool calls
   */
  hasToolUse(response) {
    if (response.choices && response.choices[0] && response.choices[0].message) {
      return !!(
        response.choices[0].message.tool_calls && response.choices[0].message.tool_calls.length > 0
      );
    }
    return false;
  }

  /**
   * Get tool call blocks from OpenAI response
   * @param {Object} response - OpenAI API response
   * @returns {Array} Array of tool call objects
   */
  getToolUseBlocks(response) {
    if (response.choices && response.choices[0] && response.choices[0].message) {
      return response.choices[0].message.tool_calls || [];
    }
    return [];
  }
}
