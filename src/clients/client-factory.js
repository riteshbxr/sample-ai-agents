/**
 * Client Factory
 *
 * Factory function to create AI clients. This is in a separate file to avoid
 * circular dependencies between the interface and concrete implementations.
 */

import { OpenAIClient } from './openai-client.js';
import { ClaudeClient } from './claude-client.js';

/**
 * @typedef {'openai'|'claude'} Provider - AI provider name
 */

/**
 * Create a unified client factory
 * Returns the appropriate client based on provider
 * @param {Provider} [provider='openai'] - 'openai' or 'claude'
 * @param {string} [model] - Optional model name
 * @returns {import('./ai-client-interface.js').AIClientInterface} Client instance
 * @throws {Error} If provider is not supported
 */
export function createAIClient(provider = 'openai', model = null) {
  if (provider === 'openai') {
    return new OpenAIClient(model);
  } else if (provider === 'claude') {
    return new ClaudeClient(model);
  } else {
    throw new Error(`Unsupported provider: ${provider}. Use 'openai' or 'claude'`);
  }
}
