/**
 * Resilient AI Client
 * Wraps AI clients with retry logic and error handling
 */
export class ResilientAIClient {
  constructor(client, maxRetries = 3, baseDelay = 1000) {
    this.client = client;
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(fn, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        console.error(`❌ Max retries (${this.maxRetries}) exceeded`);
        throw error;
      }

      // Check if error is retryable
      const isRetryable = this.isRetryableError(error);
      if (!isRetryable) {
        console.error('❌ Non-retryable error:', error.message);
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.3 * delay; // Add 30% jitter
      const totalDelay = delay + jitter;

      console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}`);
      console.log(`   Retrying in ${Math.round(totalDelay)}ms...`);

      await this.sleep(totalDelay);
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    // Rate limit errors
    if (error.status === 429) return true;

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) return true;

    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;

    // OpenAI specific rate limit
    if (error.message?.includes('rate limit')) return true;

    return false;
  }

  /**
   * Chat with retry logic
   */
  async chat(messages, options = {}) {
    return this.retryWithBackoff(async () => {
      return await this.client.chat(messages, options);
    });
  }

  /**
   * Streaming chat with retry logic
   */
  async chatStream(messages, onChunk, options = {}) {
    return this.retryWithBackoff(async () => {
      return await this.client.chatStream(messages, onChunk, options);
    });
  }
}
