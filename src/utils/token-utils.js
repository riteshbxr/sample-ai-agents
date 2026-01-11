/**
 * Token Utilities
 * Common functions for token counting and estimation
 */

/**
 * Rough token estimation (1 token ≈ 4 characters for English)
 * For accurate counting, use tiktoken library or API response
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated number of tokens
 */
export function estimateTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  // Rough approximation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens in messages array
 * @param {Array<{role: string, content: string}>} messages - Array of message objects
 * @returns {number} Total estimated tokens
 */
export function countMessages(messages) {
  if (!Array.isArray(messages)) {
    return 0;
  }

  return messages.reduce((total, msg) => {
    return total + estimateTokens(msg.content || '');
  }, 0);
}

/**
 * Get actual token count from API response
 * @param {Object} response - API response object
 * @returns {Object|null} Token counts or null if not available
 */
export function getActualTokens(response) {
  if (response?.usage) {
    return {
      prompt: response.usage.prompt_tokens || 0,
      completion: response.usage.completion_tokens || 0,
      total: response.usage.total_tokens || 0,
    };
  }
  return null;
}

/**
 * Estimate tokens for a conversation with context window management
 * @param {Array} messages - Conversation messages
 * @param {number} maxTokens - Maximum tokens allowed
 * @returns {Object} Token estimation and optimization info
 */
export function estimateConversationTokens(messages, maxTokens = 4000) {
  const estimated = countMessages(messages);
  const fits = estimated <= maxTokens;
  const excess = Math.max(0, estimated - maxTokens);

  return {
    estimated,
    maxTokens,
    fits,
    excess,
    utilizationPercent: ((estimated / maxTokens) * 100).toFixed(1),
  };
}

/**
 * Optimize context by removing oldest messages until under token limit
 * @param {Array} messages - Conversation messages
 * @param {number} maxTokens - Maximum tokens allowed
 * @param {boolean} keepSystemMessage - Whether to always keep system message
 * @returns {Object} Optimized messages and stats
 */
export function optimizeContext(messages, maxTokens = 3000, keepSystemMessage = true) {
  const currentTokens = countMessages(messages);

  if (currentTokens <= maxTokens) {
    return {
      optimized: messages,
      removed: 0,
      reduction: 0,
      originalTokens: currentTokens,
      optimizedTokens: currentTokens,
    };
  }

  // Keep system message if requested
  const systemMessage = keepSystemMessage && messages[0]?.role === 'system' ? messages[0] : null;
  const userMessages = keepSystemMessage ? messages.slice(1) : messages;

  // Remove oldest messages until under budget
  let optimized = systemMessage ? [systemMessage] : [];
  let removed = 0;

  // Start from the end (most recent) and work backwards
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const testMessages = [...optimized, userMessages[i]];
    if (countMessages(testMessages) <= maxTokens) {
      optimized.push(userMessages[i]);
    } else {
      removed++;
    }
  }

  // Reverse to maintain chronological order
  if (systemMessage) {
    optimized = [systemMessage, ...optimized.slice(1).reverse()];
  } else {
    optimized = optimized.reverse();
  }

  const reduction = currentTokens - countMessages(optimized);

  return {
    optimized,
    removed,
    reduction,
    originalTokens: currentTokens,
    optimizedTokens: countMessages(optimized),
  };
}
