import { createAIClient } from '../clients/client-factory.js';
import { providerUtils } from '../config.js';

/**
 * Chat Service
 * Provides reusable chat functionality for simple conversations
 */
export class ChatService {
  constructor(provider = null) {
    this.provider = provider || providerUtils.getDefaultProvider();
    this.client = createAIClient(this.provider);
  }

  /**
   * Send a simple chat message
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<Object>} AI response
   */
  async chat(messages, options = {}) {
    const response = await this.client.chat(messages, options);
    return {
      content: this.client.getTextContent(response),
      raw: response,
      provider: this.provider,
    };
  }

  /**
   * Stream chat response
   * @param {Array} messages - Array of message objects
   * @param {Function} onChunk - Callback function for each chunk
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Full response text
   */
  async chatStream(messages, onChunk, options = {}) {
    let fullResponse = '';
    await this.client.chatStream(
      messages,
      (chunk) => {
        fullResponse += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      },
      options
    );
    return fullResponse;
  }

  /**
   * Get structured JSON output from chat
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Parsed JSON object
   */
  async getStructuredOutput(messages, options = {}) {
    const chatOptions = {
      response_format: { type: 'json_object' },
      temperature: 0,
      ...options,
    };

    const response = await this.client.chat(messages, chatOptions);
    const textContent = this.client.getTextContent(response);

    try {
      return JSON.parse(textContent);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
  }

  /**
   * Extract structured data from unstructured text
   * @param {string} text - Text to extract data from
   * @param {string|Array} schema - Schema description or field list
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Extracted structured data
   */
  async extractStructuredData(text, schema, options = {}) {
    const schemaDescription = Array.isArray(schema)
      ? schema.map((field) => `- ${field}`).join('\n')
      : schema;

    const messages = [
      {
        role: 'system',
        content: `You are a data extraction assistant. Extract information and return it as valid JSON. ${schemaDescription}`,
      },
      {
        role: 'user',
        content: `Extract the following information from this text and return it as valid JSON:\n${schemaDescription}\n\nText: ${text}\n\nReturn only valid JSON, no additional text.`,
      },
    ];

    return this.getStructuredOutput(messages, options);
  }
}
