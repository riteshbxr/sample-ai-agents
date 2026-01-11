import {
  estimateTokens as estimateTokensUtil,
  countMessages as countMessagesUtil,
  getActualTokens as getActualTokensUtil,
} from '../../../utils/token-utils.js';

/**
 * Token Counter
 * Provides token counting utilities
 */
export class TokenCounter {
  /**
   * Rough token estimation (1 token ≈ 4 characters for English)
   * For accurate counting, use tiktoken library or API response
   */
  static estimateTokens(text) {
    return estimateTokensUtil(text);
  }

  /**
   * Count tokens in messages array
   */
  static countMessages(messages) {
    return countMessagesUtil(messages);
  }

  /**
   * Get actual token count from API response
   */
  static getActualTokens(response) {
    return getActualTokensUtil(response);
  }
}
