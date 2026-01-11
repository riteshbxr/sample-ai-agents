/**
 * Pricing configuration per 1M tokens (as of 2024, adjust as needed)
 */
export const PRICING = {
  openai: {
    'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  },
  claude: {
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
    'claude-3-opus': { input: 15.0, output: 75.0 },
  },
};
