import {
  estimateTokens as estimateTokensUtil,
  countMessages as countMessagesUtil,
} from '../../../utils/token-utils.js';

/**
 * Conversation Manager
 * Manages conversation history with automatic summarization
 */
export class ConversationManager {
  constructor(client, maxTokens = 8000, summaryThreshold = 0.8) {
    this.client = client;
    this.maxTokens = maxTokens;
    this.summaryThreshold = summaryThreshold;
    this.conversationHistory = [];
    this.summaries = [];
  }

  /**
   * Estimate tokens (using utility function)
   */
  estimateTokens(text) {
    return estimateTokensUtil(text);
  }

  /**
   * Get total tokens in conversation
   */
  getTotalTokens() {
    return countMessagesUtil(this.conversationHistory);
  }

  /**
   * Summarize old conversation history
   */
  async summarizeHistory(messages) {
    const conversationText = messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

    const summaryPrompt = `Summarize this conversation, preserving key information, decisions, and context:

${conversationText}

Provide a concise summary that captures the essential information.`;

    // Use interface method - works for both OpenAI and Claude
    const response = await this.client.chat([{ role: 'user', content: summaryPrompt }], {
      temperature: 0.3,
    });

    return this.client.getTextContent(response);
  }

  /**
   * Manage conversation history - summarize when needed
   */
  async manageHistory() {
    const currentTokens = this.getTotalTokens();
    const threshold = this.maxTokens * this.summaryThreshold;

    if (currentTokens > threshold && this.conversationHistory.length > 4) {
      console.log(`  📝 Conversation getting long (${currentTokens} tokens), summarizing...`);

      // Keep system message and last 2 messages, summarize the rest
      const systemMessage = this.conversationHistory[0];
      const recentMessages = this.conversationHistory.slice(-2);
      const oldMessages = this.conversationHistory.slice(1, -2);

      if (oldMessages.length > 0) {
        const summary = await this.summarizeHistory(oldMessages);
        this.summaries.push({
          timestamp: new Date().toISOString(),
          summary,
          messageCount: oldMessages.length,
        });

        // Replace old messages with summary
        this.conversationHistory = [
          systemMessage,
          {
            role: 'system',
            content: `Previous conversation summary: ${summary}`,
          },
          ...recentMessages,
        ];

        console.log(`  ✅ Summarized ${oldMessages.length} messages into summary`);
      }
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(role, content) {
    this.conversationHistory.push({ role, content });
    await this.manageHistory();
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Get summaries
   */
  getSummaries() {
    return this.summaries;
  }

  /**
   * Reset conversation
   */
  reset() {
    this.conversationHistory = [];
    this.summaries = [];
  }
}
