import { createAIClient } from '../clients/client-factory.js';
import { providerUtils } from '../config.js';

/**
 * Assistants Service
 * Provides utilities for managing OpenAI Assistants API
 */
export class AssistantsService {
  constructor() {
    const provider = providerUtils.getDefaultAssistantsProvider();
    this.client = createAIClient(provider);
  }

  /**
   * Create an assistant
   * @param {string} instructions - Assistant instructions
   * @param {Array} tools - Array of tool definitions
   * @param {Object} options - Additional options (model, name, etc.)
   * @returns {Promise<Object>} Created assistant
   */
  async createAssistant(instructions, tools = [], options = {}) {
    const assistant = await this.client.createAssistant(instructions, tools, options);
    return assistant;
  }

  /**
   * Create a thread
   * @returns {Promise<Object>} Created thread
   */
  async createThread() {
    return await this.client.createThread();
  }

  /**
   * Add message to thread
   * @param {string} threadId - Thread ID
   * @param {string} content - Message content
   * @param {string} role - Message role (default: 'user')
   * @returns {Promise<Object>} Created message
   */
  async addMessage(threadId, content, role = 'user') {
    return await this.client.addMessage(threadId, content, role);
  }

  /**
   * Run assistant on thread
   * @param {string} threadId - Thread ID
   * @param {string} assistantId - Assistant ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Run object
   */
  async runAssistant(threadId, assistantId, options = {}) {
    let run = await this.client.runAssistant(threadId, assistantId, options);

    // Poll for completion
    while (run.status === 'queued' || run.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await this.client.retrieveRun(threadId, run.id);
    }

    return run;
  }

  /**
   * Get messages from thread
   * @param {string} threadId - Thread ID
   * @param {Object} options - Options (limit, order, etc.)
   * @returns {Promise<Array>} Array of messages
   */
  async getMessages(threadId, options = {}) {
    return await this.client.getMessages(threadId, options);
  }

  /**
   * Get assistant response from thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<string|null>} Latest assistant message or null
   */
  async getAssistantResponse(threadId) {
    const messages = await this.getMessages(threadId);
    const assistantMessage = messages.find((msg) => msg.role === 'assistant');

    if (assistantMessage && assistantMessage.content[0]) {
      const content = assistantMessage.content[0];
      if (content.type === 'text') {
        return content.text.value;
      }
    }

    return null;
  }

  /**
   * Complete conversation: add message, run assistant, get response
   * @param {string} threadId - Thread ID
   * @param {string} assistantId - Assistant ID
   * @param {string} userMessage - User message
   * @returns {Promise<string>} Assistant response
   */
  async completeConversation(threadId, assistantId, userMessage) {
    await this.addMessage(threadId, userMessage);
    const run = await this.runAssistant(threadId, assistantId);

    if (run.status === 'completed') {
      return await this.getAssistantResponse(threadId);
    }

    throw new Error(`Run failed with status: ${run.status}`);
  }
}
