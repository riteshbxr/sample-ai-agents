/**
 * Client Factory
 *
 * Factory function to create AI clients. This is in a separate file to avoid
 * circular dependencies between the interface and concrete implementations.
 */

import { AzureOpenAIClient } from './openai-client.js';
import { StandardOpenAIClient } from './standard-openai-client.js';
import { ClaudeClient } from './claude-client.js';
import { config } from '../config.js';
/**
 * @typedef {'openai'|'openai-standard'|'azure-openai'|'claude'} Provider - AI provider name
 */

/**
 * Create a unified client factory
 * Returns the appropriate client based on provider
 * @param {Provider} [provider='azure-openai'] - Provider name:
 *   - 'openai': Uses config.openai.defaultProvider to determine which client (Azure or Standard)
 *   - 'openai-standard': Always uses StandardOpenAIClient (non-Azure)
 *   - 'azure-openai': Always uses AzureOpenAIClient
 *   - 'claude': Uses ClaudeClient
 * @param {string} [model] - Optional model name
 * @returns {import('./ai-client-interface.js').AIClientInterface} Client instance
 * @throws {Error} If provider is not supported
 */
export function createAIClient(provider = 'azure-openai', model = null) {
  if (provider === 'openai-standard') {
    // Use standard OpenAI client (non-Azure)
    return new StandardOpenAIClient(model);
  } else if (provider === 'azure-openai') {
    // Use Azure OpenAI client
    return new AzureOpenAIClient(model);
  } else if (provider === 'openai') {
    // 'openai' provider uses config.openai.defaultProvider to determine which client to use
    // This allows switching between Azure and Standard OpenAI without changing code
    // Set OPENAI_DEFAULT_PROVIDER environment variable to 'azure-openai' or 'openai-standard'
    return config.openai.defaultProvider === 'azure-openai'
      ? new AzureOpenAIClient(model)
      : new StandardOpenAIClient(model);
  } else if (provider === 'claude') {
    return new ClaudeClient(model);
  } else {
    throw new Error(
      `Unsupported provider: ${provider}. Use 'openai', 'openai-standard', 'azure-openai', or 'claude'`
    );
  }
}
