import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';

/**
 * Error Handling & Retry Pattern Example
 * Demonstrates production-ready error handling with exponential backoff
 */
class ResilientAIClient {
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

/**
 * Circuit breaker pattern for API calls
 */
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN. Service unavailable.');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.warn(`🔴 Circuit breaker OPEN. Will retry after ${this.timeout}ms`);
    }
  }
}

async function errorHandlingExample() {
  console.log('=== Error Handling & Retry Pattern Example ===\n');

  // Example 1: Basic retry with exponential backoff
  console.log('1️⃣ Retry with Exponential Backoff:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const openaiClient = createAIClient('azure-openai');
    const resilientClient = new ResilientAIClient(openaiClient, 3, 1000);

    try {
      const response = await resilientClient.chat([
        { role: 'user', content: 'Hello, this is a test message.' },
      ]);
      console.log('✅ Success:', openaiClient.getTextContent(response).substring(0, 100));
    } catch (error) {
      console.error('❌ Final error:', error.message);
    }
  }

  console.log('\n');

  // Example 2: Circuit breaker pattern
  console.log('2️⃣ Circuit Breaker Pattern:');
  console.log('-'.repeat(60));

  const circuitBreaker = new CircuitBreaker(3, 10000);

  async function makeRequest() {
    return circuitBreaker.execute(async () => {
      if (providerUtils.isProviderAvailable('openai')) {
        const openaiClient = createAIClient('azure-openai');
        return await openaiClient.chat([{ role: 'user', content: 'Test message' }]);
      }
      throw new Error('No API key');
    });
  }

  try {
    await makeRequest();
    console.log('✅ Request successful');
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }

  console.log('\n');

  // Example 3: Error classification and handling
  console.log('3️⃣ Error Classification:');
  console.log('-'.repeat(60));

  function classifyError(error) {
    if (error.status === 401) {
      return { type: 'AUTH_ERROR', action: 'Check API key' };
    }
    if (error.status === 429) {
      return { type: 'RATE_LIMIT', action: 'Retry with backoff' };
    }
    if (error.status >= 500) {
      return { type: 'SERVER_ERROR', action: 'Retry later' };
    }
    if (error.status === 400) {
      return { type: 'BAD_REQUEST', action: 'Fix request parameters' };
    }
    return { type: 'UNKNOWN', action: 'Log and investigate' };
  }

  // Simulate different error types
  const errorTypes = [
    { status: 401, message: 'Unauthorized' },
    { status: 429, message: 'Rate limit exceeded' },
    { status: 500, message: 'Internal server error' },
    { status: 400, message: 'Bad request' },
  ];

  errorTypes.forEach((error) => {
    const classification = classifyError(error);
    console.log(`Error ${error.status}: ${classification.type} → ${classification.action}`);
  });

  console.log('\n');

  // Example 4: Graceful degradation
  console.log('4️⃣ Graceful Degradation:');
  console.log('-'.repeat(60));

  async function chatWithFallback(messages) {
    const providers = [];

    if (providerUtils.isProviderAvailable('openai')) {
      providers.push('openai');
    }
    if (providerUtils.isProviderAvailable('claude')) {
      providers.push('claude');
    }

    for (const provider of providers) {
      try {
        let client;
        if (provider === 'openai') {
          client = createAIClient('azure-openai');
          const response = await client.chat(messages);
          return client.getTextContent(response);
        } else if (provider === 'claude') {
          client = createAIClient('claude');
          const response = await client.chat(messages);
          return client.getTextContent(response);
        }
      } catch (error) {
        console.warn(`⚠️ ${provider} failed: ${error.message}, trying next provider...`);
        continue;
      }
    }

    throw new Error('All providers failed');
  }

  try {
    const result = await chatWithFallback([{ role: 'user', content: 'Hello!' }]);
    console.log('✅ Got response from fallback:', result.substring(0, 100));
  } catch (error) {
    console.error('❌ All providers failed');
  }
}

errorHandlingExample().catch(console.error);
