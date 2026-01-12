import { AIClientInterface } from './ai-client-interface.js';

/**
 * Mock AI Client for Testing
 * Implements AIClientInterface for testing without making actual API calls
 *
 * @extends {AIClientInterface}
 */
export class MockAIClient extends AIClientInterface {
  /**
   * Create a mock AI client instance
   * @param {Object} [config={}] - Configuration options
   * @param {string} [config.model='mock-model'] - Model name
   * @param {string} [config.defaultResponse='Mock response'] - Default text response
   * @param {Function} [config.chatHandler] - Custom handler for chat() calls
   * @param {Function} [config.chatStreamHandler] - Custom handler for chatStream() calls
   * @param {Function} [config.chatWithToolsHandler] - Custom handler for chatWithTools() calls
   * @param {Function} [config.getEmbeddingsHandler] - Custom handler for getEmbeddings() calls
   * @param {Function} [config.analyzeImageHandler] - Custom handler for analyzeImage() calls
   * @param {boolean} [config.simulateErrors=false] - Whether to simulate errors
   * @param {string} [config.responseFormat='openai'] - Response format: 'openai' or 'claude'
   */
  constructor(config = {}) {
    super();
    this.model = config.model || 'mock-model';
    this.defaultResponse = config.defaultResponse || 'Mock response';
    this.chatHandler = config.chatHandler;
    this.chatStreamHandler = config.chatStreamHandler;
    this.chatWithToolsHandler = config.chatWithToolsHandler;
    this.getEmbeddingsHandler = config.getEmbeddingsHandler;
    this.analyzeImageHandler = config.analyzeImageHandler;
    this.simulateErrors = config.simulateErrors || false;
    this.responseFormat = config.responseFormat || 'openai';
    this.callHistory = []; // Track all method calls for testing
  }

  /**
   * Basic chat completion
   * @param {import('./ai-client-interface.js').ChatMessage[]} messages - Array of message objects
   * @param {import('./ai-client-interface.js').ChatOptions} [options={}] - Additional options
   * @returns {Promise<import('./ai-client-interface.js').ChatResponse>} Chat completion response
   */
  async chat(messages, options = {}) {
    this.callHistory.push({ method: 'chat', messages, options, timestamp: Date.now() });

    if (this.simulateErrors) {
      throw new Error('Mock error: Simulated API error');
    }

    if (this.chatHandler) {
      return await this.chatHandler(messages, options);
    }

    return this._createResponse(this.defaultResponse);
  }

  /**
   * Streaming chat completion
   * @param {Array} messages - Array of message objects
   * @param {Function} onChunk - Callback function for each chunk
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Full response text
   */
  async chatStream(messages, onChunk = null, options = {}) {
    this.callHistory.push({ method: 'chatStream', messages, options, timestamp: Date.now() });

    if (this.simulateErrors) {
      throw new Error('Mock error: Simulated streaming error');
    }

    if (this.chatStreamHandler) {
      return await this.chatStreamHandler(messages, onChunk, options);
    }

    // Simulate streaming by breaking response into chunks
    const response = this.defaultResponse;
    const chunks = response.split(' ');

    for (const chunk of chunks) {
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate delay
      if (onChunk) {
        onChunk(chunk + ' ');
      }
    }

    return response;
  }

  /**
   * Chat with tools/functions
   * @param {Array} messages - Array of message objects
   * @param {Array} tools - Array of tool/function definitions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with tool calls
   */
  async chatWithTools(messages, tools, options = {}) {
    this.callHistory.push({
      method: 'chatWithTools',
      messages,
      tools,
      options,
      timestamp: Date.now(),
    });

    if (this.simulateErrors) {
      throw new Error('Mock error: Simulated tool calling error');
    }

    if (this.chatWithToolsHandler) {
      return await this.chatWithToolsHandler(messages, tools, options);
    }

    // Default: return a response with tool calls if tools are provided
    if (tools && tools.length > 0) {
      return this._createToolResponse(tools[0]);
    }

    return this._createResponse(this.defaultResponse);
  }

  /**
   * Get embeddings
   * @param {string|Array} input - Text or array of texts to embed
   * @param {string} embeddingModel - Optional embedding model name
   * @returns {Promise<Array>} Embedding vectors
   */
  async getEmbeddings(input, embeddingModel = null) {
    this.callHistory.push({
      method: 'getEmbeddings',
      input,
      embeddingModel,
      timestamp: Date.now(),
    });

    if (this.simulateErrors) {
      throw new Error('Mock error: Simulated embeddings error');
    }

    if (this.getEmbeddingsHandler) {
      return await this.getEmbeddingsHandler(input, embeddingModel);
    }

    // Return mock embeddings (1536-dimensional vectors)
    const texts = Array.isArray(input) ? input : [input];
    return texts.map(() => {
      // Generate deterministic mock embeddings based on input
      const vector = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
      // Normalize the vector
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map((val) => val / magnitude);
    });
  }

  /**
   * Analyze an image with a text prompt
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} prompt - Text prompt for analysis
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Analysis result
   */
  async analyzeImage(imageBase64, prompt, options = {}) {
    this.callHistory.push({
      method: 'analyzeImage',
      imageBase64,
      prompt,
      options,
      timestamp: Date.now(),
    });

    if (this.simulateErrors) {
      throw new Error('Mock error: Simulated vision error');
    }

    if (this.analyzeImageHandler) {
      return await this.analyzeImageHandler(imageBase64, prompt, options);
    }

    // Default mock response
    return 'This is a test image analysis result';
  }

  /**
   * Create an assistant
   * @param {string} instructions - Assistant instructions
   * @param {Array} tools - Array of tool definitions
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Created assistant
   */
  async createAssistant(instructions, tools = [], options = {}) {
    this.callHistory.push({
      method: 'createAssistant',
      instructions,
      tools,
      options,
      timestamp: Date.now(),
    });

    return {
      id: `asst_${Date.now()}`,
      object: 'assistant',
      created_at: Math.floor(Date.now() / 1000),
      name: options.name || 'Mock Assistant',
      description: null,
      model: options.model || this.model,
      instructions,
      tools,
      tool_resources: null,
      metadata: {},
      temperature: options.temperature || 1,
      top_p: options.top_p || 1,
    };
  }

  /**
   * Create a thread
   * @returns {Promise<Object>} Created thread
   */
  async createThread() {
    this.callHistory.push({
      method: 'createThread',
      timestamp: Date.now(),
    });

    return {
      id: `thread_${Date.now()}`,
      object: 'thread',
      created_at: Math.floor(Date.now() / 1000),
      metadata: {},
    };
  }

  /**
   * Add message to thread
   * @param {string} threadId - Thread ID
   * @param {string} content - Message content
   * @param {string} [role='user'] - Message role
   * @returns {Promise<Object>} Created message
   */
  async addMessage(threadId, content, role = 'user') {
    this.callHistory.push({
      method: 'addMessage',
      threadId,
      content,
      role,
      timestamp: Date.now(),
    });

    return {
      id: `msg_${Date.now()}`,
      object: 'thread.message',
      created_at: Math.floor(Date.now() / 1000),
      thread_id: threadId,
      role,
      content: [
        {
          type: 'text',
          text: {
            value: content,
            annotations: [],
          },
        },
      ],
      assistant_id: null,
      run_id: null,
      metadata: {},
    };
  }

  /**
   * Get messages from thread
   * @param {string} threadId - Thread ID
   * @param {Object} [options={}] - Options (limit, order, etc.)
   * @returns {Promise<Array>} Array of messages
   */
  async getMessages(threadId, options = {}) {
    this.callHistory.push({
      method: 'getMessages',
      threadId,
      options,
      timestamp: Date.now(),
    });

    // Return empty array by default, can be customized with handlers
    return [];
  }

  /**
   * Run assistant on thread
   * @param {string} threadId - Thread ID
   * @param {string} assistantId - Assistant ID
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Run object
   */
  async runAssistant(threadId, assistantId, options = {}) {
    this.callHistory.push({
      method: 'runAssistant',
      threadId,
      assistantId,
      options,
      timestamp: Date.now(),
    });

    return {
      id: `run_${Date.now()}`,
      object: 'thread.run',
      created_at: Math.floor(Date.now() / 1000),
      thread_id: threadId,
      assistant_id: assistantId,
      status: 'completed',
      started_at: Math.floor(Date.now() / 1000),
      expires_at: null,
      cancelled_at: null,
      failed_at: null,
      completed_at: Math.floor(Date.now() / 1000),
      last_error: null,
      model: this.model,
      instructions: null,
      tools: [],
      metadata: {},
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  /**
   * Retrieve run status
   * @param {string} threadId - Thread ID
   * @param {string} runId - Run ID
   * @returns {Promise<Object>} Run object with current status
   */
  async retrieveRun(threadId, runId) {
    this.callHistory.push({
      method: 'retrieveRun',
      threadId,
      runId,
      timestamp: Date.now(),
    });

    return {
      id: runId,
      object: 'thread.run',
      created_at: Math.floor(Date.now() / 1000),
      thread_id: threadId,
      assistant_id: 'asst_mock',
      status: 'completed',
      started_at: Math.floor(Date.now() / 1000),
      expires_at: null,
      cancelled_at: null,
      failed_at: null,
      completed_at: Math.floor(Date.now() / 1000),
      last_error: null,
      model: this.model,
      instructions: null,
      tools: [],
      metadata: {},
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  /**
   * Get text content from response
   * @param {Object} response - API response object
   * @returns {string} Text content
   */
  getTextContent(response) {
    if (this.responseFormat === 'claude') {
      // Claude format
      if (response.content && Array.isArray(response.content)) {
        const textBlock = response.content.find((block) => block.type === 'text');
        return textBlock ? textBlock.text : '';
      }
      return '';
    } else {
      // OpenAI format (default)
      if (response.choices && response.choices[0] && response.choices[0].message) {
        return response.choices[0].message.content || '';
      }
      return '';
    }
  }

  /**
   * Check if response contains tool use
   * @param {Object} response - API response object
   * @returns {boolean} True if response contains tool use
   */
  hasToolUse(response) {
    if (this.responseFormat === 'claude') {
      // Claude format
      if (response.content && Array.isArray(response.content)) {
        return response.content.some((block) => block.type === 'tool_use');
      }
      return false;
    } else {
      // OpenAI format (default)
      if (response.choices && response.choices[0] && response.choices[0].message) {
        return !!(
          response.choices[0].message.tool_calls &&
          response.choices[0].message.tool_calls.length > 0
        );
      }
      return false;
    }
  }

  /**
   * Get tool use blocks from response
   * @param {Object} response - API response object
   * @returns {Array} Array of tool use blocks
   */
  getToolUseBlocks(response) {
    if (this.responseFormat === 'claude') {
      // Claude format
      if (response.content && Array.isArray(response.content)) {
        return response.content.filter((block) => block.type === 'tool_use');
      }
      return [];
    } else {
      // OpenAI format (default)
      if (response.choices && response.choices[0] && response.choices[0].message) {
        return response.choices[0].message.tool_calls || [];
      }
      return [];
    }
  }

  /**
   * Create a mock OpenAI-style response
   * @private
   * @param {string} content - Response content
   * @param {Array} [toolCalls] - Optional tool calls
   * @returns {Object} Mock response object
   */
  _createResponse(content, toolCalls = null) {
    if (this.responseFormat === 'claude') {
      return {
        id: `msg_${Date.now()}`,
        content: [{ type: 'text', text: content }],
        model: this.model,
        role: 'assistant',
        stop_reason: 'end_turn',
        stop_sequence: null,
        type: 'message',
        usage: {
          input_tokens: 10,
          output_tokens: content.split(' ').length,
        },
      };
    } else {
      const response = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: content,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: content.split(' ').length,
          total_tokens: 10 + content.split(' ').length,
        },
      };

      if (toolCalls) {
        response.choices[0].message.tool_calls = toolCalls;
        response.choices[0].finish_reason = 'tool_calls';
      }

      return response;
    }
  }

  /**
   * Create a mock response with tool calls
   * @private
   * @param {Object} tool - Tool definition
   * @returns {Object} Mock response with tool calls
   */
  _createToolResponse(tool) {
    const toolName = tool.name || tool.function?.name || 'mock_tool';
    const toolId = `call_${Date.now()}`;

    if (this.responseFormat === 'claude') {
      return {
        id: `msg_${Date.now()}`,
        content: [
          {
            type: 'tool_use',
            id: toolId,
            name: toolName,
            input: { query: 'mock query' },
          },
        ],
        model: this.model,
        role: 'assistant',
        stop_reason: 'tool_use',
        type: 'message',
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      };
    } else {
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: toolId,
                  type: 'function',
                  function: {
                    name: toolName,
                    arguments: JSON.stringify({ query: 'mock query' }),
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };
    }
  }

  /**
   * Get call history for testing
   * @returns {Array} Array of all method calls
   */
  getCallHistory() {
    return this.callHistory;
  }

  /**
   * Clear call history
   */
  clearCallHistory() {
    this.callHistory = [];
  }

  /**
   * Reset the mock client to default state
   */
  reset() {
    this.callHistory = [];
    this.simulateErrors = false;
    this.chatHandler = null;
    this.chatStreamHandler = null;
    this.chatWithToolsHandler = null;
    this.getEmbeddingsHandler = null;
    this.analyzeImageHandler = null;
    this.defaultResponse = 'Mock response';
  }
}
