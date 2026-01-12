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

  /**
   * Analyze an image with a text prompt
   * Note: Not all providers support vision. Unsupported providers should throw an error.
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} prompt - Text prompt for analysis
   * @param {Object} [options={}] - Additional options (model, max_tokens, etc.)
   * @returns {Promise<string>} Analysis result
   * @throws {Error} If vision is not supported by the provider
   */
  async analyzeImage(_imageBase64, _prompt, _options = {}) {
    throw new Error(
      'analyzeImage() method must be implemented by subclass. Unsupported providers should throw an error.'
    );
  }

  /**
   * Create an assistant
   * Note: Not all providers support assistants. Unsupported providers should throw an error.
   * @param {string} instructions - Assistant instructions
   * @param {Array} tools - Array of tool definitions
   * @param {Object} [options={}] - Additional options (model, name, etc.)
   * @returns {Promise<Object>} Created assistant
   * @throws {Error} If assistants are not supported by the provider
   */
  async createAssistant(_instructions, _tools = [], _options = {}) {
    throw new Error(
      'createAssistant() method must be implemented by subclass. Unsupported providers should throw an error.'
    );
  }

  /**
   * Create a thread
   * Note: Not all providers support assistants. Unsupported providers should throw an error.
   * @returns {Promise<Object>} Created thread
   * @throws {Error} If assistants are not supported by the provider
   */
  async createThread() {
    throw new Error(
      'createThread() method must be implemented by subclass. Unsupported providers should throw an error.'
    );
  }

  /**
   * Add message to thread
   * Note: Not all providers support assistants. Unsupported providers should throw an error.
   * @param {string} threadId - Thread ID
   * @param {string} content - Message content
   * @param {string} [role='user'] - Message role
   * @returns {Promise<Object>} Created message
   * @throws {Error} If assistants are not supported by the provider
   */
  async addMessage(_threadId, _content, _role = 'user') {
    throw new Error(
      'addMessage() method must be implemented by subclass. Unsupported providers should throw an error.'
    );
  }

  /**
   * Get messages from thread
   * Note: Not all providers support assistants. Unsupported providers should throw an error.
   * @param {string} threadId - Thread ID
   * @param {Object} [options={}] - Options (limit, order, etc.)
   * @returns {Promise<Array>} Array of messages
   * @throws {Error} If assistants are not supported by the provider
   */
  async getMessages(_threadId, _options = {}) {
    throw new Error(
      'getMessages() method must be implemented by subclass. Unsupported providers should throw an error.'
    );
  }

  /**
   * Run assistant on thread
   * Note: Not all providers support assistants. Unsupported providers should throw an error.
   * @param {string} threadId - Thread ID
   * @param {string} assistantId - Assistant ID
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Run object
   * @throws {Error} If assistants are not supported by the provider
   */
  async runAssistant(_threadId, _assistantId, _options = {}) {
    throw new Error(
      'runAssistant() method must be implemented by subclass. Unsupported providers should throw an error.'
    );
  }

  /**
   * Retrieve run status
   * Note: Not all providers support assistants. Unsupported providers should throw an error.
   * @param {string} threadId - Thread ID
   * @param {string} runId - Run ID
   * @returns {Promise<Object>} Run object with current status
   * @throws {Error} If assistants are not supported by the provider
   */
  async retrieveRun(_threadId, _runId) {
    throw new Error(
      'retrieveRun() method must be implemented by subclass. Unsupported providers should throw an error.'
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
