import { OpenAI } from 'openai';
import { config } from '../config.js';
import { BaseOpenAIClient } from './base-openai-client.js';

/**
 * Standard OpenAI Client (Non-Azure)
 * Implements AIClientInterface for consistent API across providers
 * This client is specifically for OpenAI's direct API, not Azure OpenAI
 *
 * @extends {BaseOpenAIClient}
 */
export class StandardOpenAIClient extends BaseOpenAIClient {
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
    this.model = model || config.openai.model;
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
   * Create an OpenAI Assistant (for persistent AI agents)
   * Note: Assistants API is only available with standard OpenAI, not Azure OpenAI
   * @param {string} instructions - System instructions for the assistant
   * @param {Array} tools - Tools/functions the assistant can use
   * @param {Object} [options={}] - Additional options (model, name, etc.)
   * @returns {Promise<Object>} Assistant object
   */
  async createAssistant(instructions, tools = [], options = {}) {
    const assistant = await this.client.beta.assistants.create({
      name: options.name || 'AI Agent',
      instructions,
      model: options.model || this.model,
      tools,
      ...options,
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
   * Add message to thread
   * @param {string} threadId - Thread ID
   * @param {string} content - Message content
   * @param {string} [role='user'] - Message role
   * @returns {Promise<Object>} Created message
   */
  async addMessage(threadId, content, role = 'user') {
    return await this.client.beta.threads.messages.create(threadId, {
      role,
      content,
    });
  }

  /**
   * Get messages from thread
   * @param {string} threadId - Thread ID
   * @param {Object} [options={}] - Options (limit, order, etc.)
   * @returns {Promise<Array>} Array of messages
   */
  async getMessages(threadId, options = {}) {
    const messages = await this.client.beta.threads.messages.list(threadId, options);
    return messages.data;
  }

  /**
   * Run assistant on a thread
   * Note: Assistants API is only available with standard OpenAI, not Azure OpenAI
   * @param {string} threadId - Thread ID
   * @param {string} assistantId - Assistant ID
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Run object
   */
  async runAssistant(threadId, assistantId, options = {}) {
    const run = await this.client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      ...options,
    });

    return run;
  }

  /**
   * Retrieve run status
   * @param {string} threadId - Thread ID
   * @param {string} runId - Run ID
   * @returns {Promise<Object>} Run object with current status
   */
  async retrieveRun(threadId, runId) {
    return await this.client.beta.threads.runs.retrieve(threadId, runId);
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
   * Analyze an image with a text prompt
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} prompt - Text prompt for analysis
   * @param {Object} options - Additional options (model, max_tokens, etc.)
   * @returns {Promise<string>} Analysis result
   */
  async analyzeImage(imageBase64, prompt, options = {}) {
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
            },
          },
        ],
      },
    ];

    const model = options.model || config.openai.visionModel || 'gpt-4o';
    const response = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: options.max_tokens || 300,
      ...options,
    });

    return response.choices[0].message.content;
  }
}
