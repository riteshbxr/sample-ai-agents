/**
 * AI Client Interface
 *
 * Defines the common interface that all AI clients (OpenAI, Claude, etc.) must implement.
 * This ensures consistent API across different providers.
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'|'tool'} role - Message role
 * @property {string} content - Message content
 * @property {string} [name] - Optional name for tool/function messages
 * @property {Array} [tool_calls] - Optional tool calls (OpenAI format)
 * @property {string} [tool_call_id] - Optional tool call ID (OpenAI format)
 */

/**
 * @typedef {Object} ChatOptions
 * @property {number} [temperature=0.7] - Sampling temperature (0-2)
 * @property {number} [max_tokens] - Maximum tokens to generate
 * @property {number} [top_p] - Nucleus sampling parameter
 * @property {number} [frequency_penalty] - Frequency penalty (-2 to 2)
 * @property {number} [presence_penalty] - Presence penalty (-2 to 2)
 * @property {Array} [stop] - Stop sequences
 * @property {Object} [response_format] - Response format (e.g., { type: 'json_object' })
 */

/**
 * @typedef {Object} ChatResponse
 * @property {Array} choices - Response choices
 * @property {Object} usage - Token usage information
 * @property {string} model - Model used
 * @property {string} [id] - Response ID
 */

/**
 * Base AI Client Interface
 * All AI clients should implement these methods
 */
export class AIClientInterface {
  /**
   * Basic chat completion
   * @param {ChatMessage[]} messages - Array of message objects with role and content
   * @param {ChatOptions} [options={}] - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<ChatResponse>} Chat completion response
   */
  async chat(messages, _options = {}) {
    throw new Error('chat() method must be implemented by subclass');
  }

  /**
   * Streaming chat completion - Real-time token streaming
   * @param {ChatMessage[]} messages - Array of message objects
   * @param {Function} [_onChunk] - Callback function for each chunk (chunk: string) => void
   * @param {ChatOptions} [_options={}] - Additional options
   * @returns {Promise<string>} Full response text
   */
  async chatStream(messages, _onChunk = null, _options = {}) {
    throw new Error('chatStream() method must be implemented by subclass');
  }

  /**
   * @typedef {Object} ToolDefinition
   * @property {string} name - Tool name
   * @property {string} description - Tool description
   * @property {Object} parameters - JSON schema for parameters (OpenAI format)
   * @property {Object} [input_schema] - JSON schema for parameters (Claude format)
   */

  /**
   * Chat with tools/functions - Function calling capability
   * @param {ChatMessage[]} messages - Array of message objects
   * @param {ToolDefinition[]} tools - Array of tool/function definitions
   * @param {ChatOptions} [options={}] - Additional options
   * @returns {Promise<ChatResponse>} Response with tool calls
   */
  async chatWithTools(messages, tools, _options = {}) {
    throw new Error('chatWithTools() method must be implemented by subclass');
  }

  /**
   * Get text content from response
   * Extracts the text content from the API response
   * @param {ChatResponse} _response - API response object
   * @returns {string} Text content
   */
  getTextContent(_response) {
    throw new Error('getTextContent() method must be implemented by subclass');
  }

  /**
   * Check if response contains tool use
   * @param {ChatResponse} _response - API response object
   * @returns {boolean} True if response contains tool use
   */
  hasToolUse(_response) {
    throw new Error('hasToolUse() method must be implemented by subclass');
  }

  /**
   * @typedef {Object} ToolUseBlock
   * @property {string} id - Tool use ID
   * @property {string} name - Tool name
   * @property {Object} input - Tool input parameters
   */

  /**
   * Get tool use blocks from response
   * @param {ChatResponse} _response - API response object
   * @returns {ToolUseBlock[]} Array of tool use blocks
   */
  getToolUseBlocks(_response) {
    throw new Error('getToolUseBlocks() method must be implemented by subclass');
  }

  /**
   * @typedef {number[]} EmbeddingVector - Array of numbers representing embedding
   */

  /**
   * Get embeddings for RAG
   * Note: Not all providers support embeddings. Unsupported providers should throw an error.
   * @param {string|string[]} input - Text or array of texts to embed
   * @param {string} [embeddingModel] - Optional embedding model name
   * @returns {Promise<EmbeddingVector[]>} Embedding vectors
   * @throws {Error} If embeddings are not supported by the provider
   */
  async getEmbeddings(input, _embeddingModel = null) {
    throw new Error(
      'getEmbeddings() method must be implemented by subclass. Unsupported providers should throw an error.'
    );
  }
}

/**
 * Helper function to check if a client implements the interface
 * @param {AIClientInterface|Object} client - Client instance to check
 * @returns {boolean} True if client implements all required methods
 */
export function implementsAIClientInterface(client) {
  const requiredMethods = [
    'chat',
    'chatStream',
    'chatWithTools',
    'getTextContent',
    'hasToolUse',
    'getToolUseBlocks',
  ];

  return requiredMethods.every((method) => typeof client[method] === 'function');
}
