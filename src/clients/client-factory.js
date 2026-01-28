/**
 * Client Factory
 *
 * Factory function to create AI clients. This is in a separate file to avoid
 * circular dependencies between the interface and concrete implementations.
 */

import { AzureOpenAIClient } from './azure-openai-client.js';
import { StandardOpenAIClient } from './standard-openai-client.js';
import { ClaudeClient } from './claude-client.js';
import { MockAIClient } from './mock-client.js';
import { config } from '../config.js';

/**
 * @typedef {'openai'|'openai-standard'|'azure-openai'|'claude'|'mock'} Provider - AI provider name
 */

/** @type {ReadonlyArray<Provider>} */
const VALID_PROVIDERS = Object.freeze([
  'openai',
  'openai-standard',
  'azure-openai',
  'claude',
  'mock',
]);

/**
 * Create a unified client factory
 * Returns the appropriate client based on provider
 * @param {Provider} [provider='azure-openai'] - Provider name:
 *   - 'openai': Uses config.openai.defaultProvider to determine which client (Azure or Standard)
 *   - 'openai-standard': Always uses StandardOpenAIClient (non-Azure)
 *   - 'azure-openai': Always uses AzureOpenAIClient
 *   - 'claude': Uses ClaudeClient
 *   - 'mock': Uses MockAIClient for testing
 * @param {string|null} [model=null] - Optional model name
 * @returns {import('./ai-client-interface.js').AIClientInterface} Client instance
 * @throws {Error} If provider is not supported
 */
export function createAIClient(provider = 'azure-openai', model = null) {
  switch (provider) {
    case 'openai':
      // 'openai' routes based on config.openai.defaultProvider
      // Set OPENAI_DEFAULT_PROVIDER env var to 'azure-openai' or 'openai-standard'
      return config.openai.defaultProvider === 'azure-openai'
        ? new AzureOpenAIClient(model)
        : new StandardOpenAIClient(model);

    case 'openai-standard':
      return new StandardOpenAIClient(model);

    case 'azure-openai':
      return new AzureOpenAIClient(model);

    case 'claude':
      return new ClaudeClient(model);

    case 'mock':
      return new MockAIClient(model ? { model } : {});

    default:
      throw new Error(
        `Unsupported provider: ${provider}. Valid providers: ${VALID_PROVIDERS.join(', ')}`
      );
  }
}

/**
 * Check if a provider name is valid
 * @param {string} provider - Provider name to check
 * @returns {provider is Provider} True if valid provider
 */
export function isValidProvider(provider) {
  return VALID_PROVIDERS.includes(/** @type {Provider} */ (provider));
}

/**
 * Check if a provider is available (has required configuration)
 * @param {Provider} provider - Provider name to check
 * @returns {boolean} True if provider is configured and available
 */
export function isProviderAvailable(provider) {
  switch (provider) {
    case 'openai':
      return !!(config.openai.standardApiKey || config.openai.azureApiKey);
    case 'openai-standard':
      return !!config.openai.standardApiKey;
    case 'azure-openai':
      return !!(config.openai.azureApiKey && config.openai.azure.endpoint);
    case 'claude':
      return !!config.claude?.apiKey;
    case 'mock':
      return true; // Mock is always available
    default:
      return false;
  }
}

/**
 * Create an AI client with automatic fallback to available providers
 *
 * Attempts to create a client using the preferred provider. If that fails
 * (e.g., missing API key), falls back to other available providers in order.
 *
 * @param {Provider[]} [preferredOrder=['openai', 'claude', 'mock']] - Order of preference
 * @param {string|null} [model=null] - Optional model name
 * @returns {import('./ai-client-interface.js').AIClientInterface} Client instance
 * @throws {Error} If no provider is available
 *
 * @example
 * // Try OpenAI first, then Claude, then mock
 * const client = createAIClientWithFallback();
 *
 * @example
 * // Prefer Claude, fallback to OpenAI
 * const client = createAIClientWithFallback(['claude', 'openai']);
 */
export function createAIClientWithFallback(
  preferredOrder = ['openai', 'claude', 'mock'],
  model = null
) {
  const attemptedProviders = [];

  for (const provider of preferredOrder) {
    if (!isValidProvider(provider)) {
      continue;
    }

    if (isProviderAvailable(provider)) {
      try {
        return createAIClient(provider, model);
      } catch (error) {
        // Log but continue to next provider
        attemptedProviders.push({ provider, error: error.message });
      }
    } else {
      attemptedProviders.push({ provider, error: 'Not configured' });
    }
  }

  // Build helpful error message
  const attempted = attemptedProviders.map((p) => `  - ${p.provider}: ${p.error}`).join('\n');

  throw new Error(
    `No AI provider available. Attempted providers:\n${attempted}\n\n` +
      'Please configure at least one provider in your .env file.'
  );
}

/**
 * Get a list of currently available providers
 * @returns {Provider[]} List of available provider names
 */
export function getAvailableProviders() {
  return VALID_PROVIDERS.filter((p) => isProviderAvailable(p));
}
