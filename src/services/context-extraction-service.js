import { createAIClient } from '../clients/client-factory.js';
import { providerUtils } from '../config.js';

/**
 * Context Extraction Service
 * Extracts relevant context from chat history for template generation and other use cases
 */
export class ContextExtractionService {
  constructor(provider = null) {
    this.provider = provider || providerUtils.getDefaultProvider();
    this.client = createAIClient(this.provider);
  }

  /**
   * Extract relevant context from chat history
   * @param {Array} chatHistory - Array of message objects
   * @param {string} goal - Goal/description for context extraction
   * @param {Object} options - Options (maxContextLength, includeSystemMessages, filterToolCalls)
   * @returns {Promise<Object>} Extracted context with metadata
   */
  async extractRelevantContext(chatHistory, goal, options = {}) {
    const {
      maxContextLength = 1000,
      includeSystemMessages = false,
      filterToolCalls = true,
    } = options;

    // Step 1: Filter messages (remove AI messages with tool calls if needed)
    let filteredMessages = this.filterMessages(chatHistory, {
      includeSystemMessages,
      filterToolCalls,
    });

    // Step 2: Extract relevant messages using LLM
    const relevantMessages = await this.identifyRelevantMessages(
      filteredMessages,
      goal,
      maxContextLength
    );

    // Step 3: Combine into context string
    const context = this.combineMessages(relevantMessages);

    return {
      context,
      messageCount: relevantMessages.length,
      totalLength: context.length,
    };
  }

  /**
   * Filter messages based on criteria
   * @param {Array} messages - Messages to filter
   * @param {Object} options - Filter options
   * @returns {Array} Filtered messages
   */
  filterMessages(messages, options = {}) {
    const { includeSystemMessages = false, filterToolCalls = true } = options;

    return messages.filter((message) => {
      // Filter system messages if not included
      if (!includeSystemMessages && message.role === 'system') {
        return false;
      }

      // Filter tool messages
      if (message.role === 'tool') {
        return false;
      }

      // Filter AI messages with tool calls (if enabled)
      if (filterToolCalls && message.role === 'assistant') {
        // Check if message has tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          return false;
        }
        if (message.content && Array.isArray(message.content)) {
          const hasToolUse = message.content.some((c) => c.type === 'tool_use');
          if (hasToolUse) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Identify relevant messages using LLM
   * @param {Array} messages - Messages to analyze
   * @param {string} goal - Goal for relevance
   * @param {number} maxLength - Maximum context length
   * @returns {Promise<Array>} Relevant messages
   */
  async identifyRelevantMessages(messages, goal, maxLength) {
    if (messages.length === 0) {
      return [];
    }

    // Build prompt for context extraction
    const systemPrompt = `You are an AI assistant that extracts relevant messages from chat history.
Your task is to identify which messages from the conversation history are relevant to the given goal.

Instructions:
1. Review all messages in the chat history
2. Identify messages that contain information relevant to the goal
3. Return the indices of relevant messages (0-based)
4. Only include messages that directly relate to the goal
5. Preserve the original wording of messages - do not summarize or omit content

Return your response as a JSON object with an "indices" array.`;

    const userPrompt = `Goal: ${goal}

Chat History:
${messages.map((msg, i) => `[${i}] ${msg.role}: ${this.getMessageContent(msg)}`).join('\n')}

Return a JSON object with an "indices" array of message indices that are relevant to the goal. Example: {"indices": [0, 2, 5]}`;

    try {
      const response = await this.client.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }
      );

      const content =
        response.choices?.[0]?.message?.content || response.content?.[0]?.text || '{}';
      const result = JSON.parse(content);

      // Extract indices (handle different response formats)
      const indices = result.indices || result.relevant_indices || result.messages || [];

      // Get relevant messages
      const relevantMessages = indices
        .filter((idx) => idx >= 0 && idx < messages.length)
        .map((idx) => messages[idx]);

      // Limit by max length
      let combined = this.combineMessages(relevantMessages);
      if (combined.length > maxLength) {
        // Truncate from the end, keeping most recent messages
        const truncated = [];
        let currentLength = 0;
        for (let i = relevantMessages.length - 1; i >= 0; i--) {
          const msgContent = this.getMessageContent(relevantMessages[i]);
          // Account for role prefix and separators (e.g., "User: " and "\n\n")
          const rolePrefix =
            relevantMessages[i].role === 'user'
              ? 'User: '
              : relevantMessages[i].role === 'assistant'
                ? 'Assistant: '
                : 'System: ';
          const separator = truncated.length > 0 ? '\n\n' : '';
          const msgLength = rolePrefix.length + msgContent.length + separator.length;

          if (currentLength + msgLength <= maxLength) {
            truncated.unshift(relevantMessages[i]);
            currentLength += msgLength;
          } else {
            break;
          }
        }
        return truncated;
      }

      return relevantMessages;
    } catch {
      // Fallback: return all filtered messages
      return messages;
    }
  }

  /**
   * Get message content (handles different message formats)
   * @param {Object} message - Message object
   * @returns {string} Message content
   */
  getMessageContent(message) {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      return message.content
        .filter((c) => c.type === 'text')
        .map((c) => {
          // Handle nested text objects (Claude format)
          if (typeof c.text === 'object' && c.text !== null) {
            return c.text.value || c.text.text || String(c.text);
          }
          return c.text;
        })
        .join(' ');
    }
    return String(message.content || '');
  }

  /**
   * Combine messages into context string
   * @param {Array} messages - Messages to combine
   * @returns {string} Combined context
   */
  combineMessages(messages) {
    return messages
      .map((msg) => {
        const role =
          msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
        const content = this.getMessageContent(msg);
        return `${role}: ${content}`;
      })
      .join('\n\n');
  }

  /**
   * Extract context for template generation
   * @param {Array} chatHistory - Chat history
   * @param {string} templateDescription - Template description/goal
   * @returns {Promise<string>} Extracted context
   */
  async extractTemplateContext(chatHistory, templateDescription) {
    const userMessage = `Based on the chat history, extract all messages relevant for the content the following Template goal/description:
\`\`\`txt
${templateDescription}
\`\`\`

Append all the relevant chat messages together into a single response, in their original wording, without summarizing or omitting any content.
If there are no relevant chat messages, return "" (empty string).`;

    // Filter messages (remove AI messages with tool calls)
    const filteredMessages = this.filterMessages(chatHistory, {
      filterToolCalls: true,
      includeSystemMessages: false,
    });

    // Add the extraction request as a user message
    const messages = [...filteredMessages, { role: 'user', content: userMessage }];

    // Get extraction from LLM
    const response = await this.client.chat(messages);
    const extractedContext =
      response.choices?.[0]?.message?.content || response.content?.[0]?.text || '';

    return extractedContext === '""' ? '' : extractedContext;
  }
}
