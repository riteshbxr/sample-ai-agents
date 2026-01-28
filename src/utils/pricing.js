/**
 * Pricing configuration per 1M tokens (as of January 2026)
 * @see https://openai.com/pricing
 * @see https://www.anthropic.com/pricing
 */
export const PRICING = {
  openai: {
    // GPT-4o models
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-2024-11-20': { input: 2.5, output: 10.0 },
    'gpt-4o-2024-08-06': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.6 },
    // GPT-4 Turbo
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
    'gpt-4-turbo-2024-04-09': { input: 10.0, output: 30.0 },
    // GPT-4 (legacy)
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-4-32k': { input: 60.0, output: 120.0 },
    // GPT-3.5
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'gpt-3.5-turbo-0125': { input: 0.5, output: 1.5 },
    // o1 reasoning models
    o1: { input: 15.0, output: 60.0 },
    'o1-preview': { input: 15.0, output: 60.0 },
    'o1-mini': { input: 3.0, output: 12.0 },
    // Mock for testing
    'mock-model': { input: 0.1, output: 0.1 },
  },
  claude: {
    // Claude 4 models
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
    // Claude 3.5 models
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet-20240620': { input: 3.0, output: 15.0 },
    'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
    // Claude 3 models
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-opus': { input: 15.0, output: 75.0 },
    'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    // Mock for testing
    'mock-model': { input: 0.1, output: 0.1 },
  },
  // Embedding models
  embeddings: {
    'text-embedding-3-small': { input: 0.02 },
    'text-embedding-3-large': { input: 0.13 },
    'text-embedding-ada-002': { input: 0.1 },
  },
};
