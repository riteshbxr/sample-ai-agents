/**
 * Client Factory
 *
 * Factory function to create AI clients. This is in a separate file to avoid
 * circular dependencies between the interface and concrete implementations.
 */

import { OpenAIClient } from './openai-client.js';
import { StandardOpenAIClient } from './standard-openai-client.js';
import { ClaudeClient } from './claude-client.js';

/**
 * @typedef {'openai'|'openai-standard'|'azure-openai'|'claude'} Provider - AI provider name
 */

/**
 * Create a unified client factory
 * Returns the appropriate client based on provider
 * @param {Provider} [provider='azure-openai'] - 'openai' (standard), 'openai-standard', 'azure-openai', or 'claude'
 * @param {string} [model] - Optional model name
 * @returns {import('./ai-client-interface.js').AIClientInterface} Client instance
 * @throws {Error} If provider is not supported
 */
export function createAIClient(provider = 'azure-openai', model = null) {
  if (provider === 'openai' || provider === 'openai-standard') {
    // Use standard OpenAI client (non-Azure)
    return new StandardOpenAIClient(model);
  } else if (provider === 'azure-openai') {
    // Use Azure OpenAI client
    return new OpenAIClient(model);
  } else if (provider === 'claude') {
    return new ClaudeClient(model);
  } else {
    throw new Error(
      `Unsupported provider: ${provider}. Use 'openai', 'openai-standard', 'azure-openai', or 'claude'`
    );
  }
}
