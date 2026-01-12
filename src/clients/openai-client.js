import { OpenAI } from 'openai';
import { config } from '../config.js';
import { AIClientInterface } from './ai-client-interface.js';

/**
 * Azure OpenAI Client
 * Implements AIClientInterface for consistent API across providers
 * This client is specifically for Azure OpenAI service
 *
 * @extends {AIClientInterface}
 */
export class AzureOpenAIClient extends AIClientInterface {
  /**
   * Create Azure OpenAI client instance
   * @param {string} [model] - Optional model name (overrides config)
   */
  constructor(model = null) {
    super();
    // Azure OpenAI requires azureApiKey or standardApiKey
    const apiKey = config.openai.azureApiKey || config.openai.standardApiKey;
    if (!apiKey) {
      throw new Error('AZURE_OPENAI_API_KEY or OPENAI_API_KEY is not set in environment variables');
    }

    // Configure for Azure OpenAI if endpoint is provided
    const clientConfig = {
      apiKey: apiKey,
    };

    if (config.openai.azure.enabled) {
      // Azure OpenAI configuration
      // Remove trailing slash from endpoint if present
      const endpoint = config.openai.azure.endpoint.replace(/\/$/, '');
      const deployment = model || config.openai.azure.deployment;

      // Azure OpenAI requires the full path with deployment
      // Format: https://{resource}.openai.azure.com/openai/deployments/{deployment}
      // The SDK will append /chat/completions to this baseURL
      clientConfig.baseURL = `${endpoint}/openai/deployments/${deployment}`;
      clientConfig.defaultQuery = {
        'api-version': config.openai.azure.apiVersion,
      };
      // For Azure, we still need to pass the deployment name as model
      // Some Azure setups require this, others don't
      this.model = deployment;
      this.isAzure = true;
    } else {
      // Standard OpenAI configuration
      this.model = model || config.openai.model;
      this.isAzure = false;
    }

    this.client = new OpenAI(clientConfig);

    // Ensure model is set
    if (!this.model) {
      this.model = config.openai.azure.enabled
        ? config.openai.azure.deployment
        : config.openai.model;
    }
  }

  /**
   * Basic chat completion
   * @param {import('./ai-client-interface.js').ChatMessage[]} messages - Array of message objects with role and content
   * @param {import('./ai-client-interface.js').ChatOptions} [options={}] - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<import('./ai-client-interface.js').ChatResponse>} Chat completion response
   */
  async chat(messages, options = {}) {
    // For Azure OpenAI with deployment in baseURL, we may not need model parameter
    // But some Azure setups require it, so we'll include it
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
      messages,
      stream: true,
      ...options,
    };

    // Include model parameter
    requestOptions.model = this.model;

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
   * Note: Assistants API is only available with OpenAI, not Azure OpenAI
   * @param {string} instructions - System instructions for the assistant
   * @param {Array} tools - Tools/functions the assistant can use
   * @returns {Promise<Object>} Assistant object
   */
  async createAssistant(instructions, tools = []) {
    if (this.isAzure) {
      throw new Error(
        'Assistants API is not supported with Azure OpenAI. Please use OpenAI direct API (OPENAI_API_KEY) instead of Azure OpenAI.'
      );
    }

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
   * Note: Assistants API is only available with OpenAI, not Azure OpenAI
   * @returns {Promise<Object>} Thread object
   */
  async createThread() {
    if (this.isAzure) {
      throw new Error(
        'Assistants API is not supported with Azure OpenAI. Please use OpenAI direct API (OPENAI_API_KEY) instead of Azure OpenAI.'
      );
    }

    const thread = await this.client.beta.threads.create();
    return thread;
  }

  /**
   * Run assistant on a thread
   * Note: Assistants API is only available with OpenAI, not Azure OpenAI
   * @param {string} threadId - Thread ID
   * @param {string} assistantId - Assistant ID
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} Run object
   */
  async runAssistant(threadId, assistantId, userMessage) {
    if (this.isAzure) {
      throw new Error(
        'Assistants API is not supported with Azure OpenAI. Please use OpenAI direct API (OPENAI_API_KEY) instead of Azure OpenAI.'
      );
    }

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
    let model = embeddingModel;
    let embeddingsClient = this.client;

    // For Azure OpenAI, embeddings need a separate deployment
    if (config.openai.azure.enabled && !model) {
      model = config.openai.azure.embeddingDeployment;

      // Create a separate client for embeddings with the embedding deployment
      const endpoint = config.openai.azure.endpoint.replace(/\/$/, '');
      const embeddingDeployment = config.openai.azure.embeddingDeployment;

      embeddingsClient = new OpenAI({
        apiKey: config.openai.azureApiKey || config.openai.standardApiKey,
        baseURL: `${endpoint}/openai/deployments/${embeddingDeployment}`,
        defaultQuery: {
          'api-version': config.openai.azure.apiVersion,
        },
      });
    } else if (!model) {
      // Standard OpenAI - use default embedding model
      model = 'text-embedding-3-small';
    }

    const response = await embeddingsClient.embeddings.create({
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
