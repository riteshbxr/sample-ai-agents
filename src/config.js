import dotenv from 'dotenv';

dotenv.config();

export const config = {
  openai: {
    /**
     * Default provider when 'openai' is specified as provider
     * Can be 'azure-openai' or 'openai-standard'
     * When createAIClient('openai') is called, it will use this default
     * Set via OPENAI_DEFAULT_PROVIDER environment variable
     * @type {'azure-openai'|'openai-standard'}
     */
    defaultProvider:
      process.env.OPENAI_DEFAULT_PROVIDER ||
      (process.env.AZURE_OPENAI_API_KEY ? 'azure-openai' : 'openai-standard'),
    // Separate access to standard OpenAI API key (for Assistants API which requires non-Azure)
    standardApiKey: process.env.OPENAI_API_KEY,
    azureApiKey: process.env.AZURE_OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-turbo-preview',
    /**
     * Vision model for image analysis capabilities
     * Separate from the default chat model as vision requires specific models
     * @type {string}
     */
    visionModel: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
    // Azure OpenAI configuration
    azure: {
      enabled: !!process.env.AZURE_OPENAI_ENDPOINT,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
      deployment:
        process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      embeddingDeployment:
        process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
    },
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
    apiVersion: process.env.ANTHROPIC_API_VERSION || '2023-06-01',
  },
  chroma: {
    persistDirectory: process.env.CHROMA_PERSIST_DIR || './chroma_db',
  },
  langfuse: {
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    host: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
  },
  logger: {
    level: process.env.LOG_LEVEL,
    format: process.env.LOG_FORMAT,
  },
};

/**
 * Provider Detection Utilities
 * Centralized logic for determining the default AI provider
 */
export const providerUtils = {
  /**
   * Get the default provider with smart routing
   * Returns 'openai' which routes to Azure or Standard based on config
   * @returns {string} Provider name ('openai', 'claude')
   * @throws {Error} If no provider is configured (unless in test mode)
   */
  getDefaultProvider() {
    // Allow test keys or test environment to bypass validation
    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_TEST_CONTEXT !== undefined ||
      (typeof process.env.npm_lifecycle_script === 'string' &&
        process.env.npm_lifecycle_script.includes('test'));

    if (config.openai.azureApiKey || config.openai.standardApiKey) {
      return 'openai'; // Smart routing based on config.openai.defaultProvider
    }
    if (config.claude.apiKey) {
      return 'claude';
    }

    // In test mode, return a default provider
    if (isTestEnv) {
      return 'mock';
    }

    throw new Error('No AI provider configured. Please set API keys in .env file');
  },

  /**
   * Get the default provider for vision tasks
   * Vision tasks require specific models, so we explicitly use standard OpenAI or Claude
   * @returns {string} Provider name ('openai-standard', 'claude')
   * @throws {Error} If no provider is configured (unless in test mode)
   */
  getDefaultVisionProvider() {
    // Allow test keys or test environment to bypass validation
    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_TEST_CONTEXT !== undefined ||
      (typeof process.env.npm_lifecycle_script === 'string' &&
        process.env.npm_lifecycle_script.includes('test'));

    if (config.openai.azureApiKey || config.openai.standardApiKey) {
      return 'openai-standard'; // Vision works best with standard OpenAI
    }
    if (config.claude.apiKey) {
      return 'claude';
    }

    // In test mode, return a default provider
    if (isTestEnv) {
      return 'mock';
    }

    throw new Error('No AI provider configured for vision tasks');
  },

  /**
   * Get the default provider for assistants API
   * Assistants API only works with standard OpenAI (not Azure)
   * @returns {string} Provider name ('openai-standard')
   * @throws {Error} If OpenAI standard API key is not configured (unless in test mode)
   */
  getDefaultAssistantsProvider() {
    // Allow test keys or test environment to bypass validation
    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_TEST_CONTEXT !== undefined ||
      (typeof process.env.npm_lifecycle_script === 'string' &&
        process.env.npm_lifecycle_script.includes('test'));

    if (!config.openai.standardApiKey && !isTestEnv) {
      throw new Error('OpenAI standard API key required for Assistants API');
    }

    // In test mode without a key, still return the provider
    // The client will be replaced with a mock in tests
    if (isTestEnv && !config.openai.standardApiKey) {
      return 'mock';
    }

    return 'openai-standard';
  },

  /**
   * Check if a specific provider is available
   * @param {string} provider - Provider name
   * @returns {boolean} True if provider is configured
   */
  isProviderAvailable(provider) {
    switch (provider) {
      case 'openai':
        return !!config.openai.standardApiKey || !!config.openai.azureApiKey;
      case 'openai-standard':
        return !!config.openai.standardApiKey;
      case 'azure-openai':
        return !!config.openai.azureApiKey;
      case 'claude':
        return !!config.claude.apiKey;
      case 'mock':
        return (
          process.env.NODE_ENV === 'test' ||
          process.env.NODE_TEST_CONTEXT !== undefined ||
          (typeof process.env.npm_lifecycle_script === 'string' &&
            process.env.npm_lifecycle_script.includes('test'))
        );
      default:
        return false;
    }
  },

  /**
   * Get the default model name for a provider
   * @param {string} provider - Provider name ('openai', 'claude', etc.)
   * @returns {string} Default model name for the provider
   * @throws {Error} If provider is not supported
   */
  getDefaultModel(provider) {
    switch (provider) {
      case 'openai':
      case 'openai-standard':
      case 'azure-openai':
        return config.openai.model;
      case 'claude':
        return config.claude.model;
      case 'mock':
        return 'mock-model';
      default:
        throw new Error(`Unsupported provider for model: ${provider}`);
    }
  },

  /**
   * Get the vision model name for a provider
   * @param {string} provider - Provider name ('openai', 'claude', etc.)
   * @returns {string} Vision model name for the provider
   * @throws {Error} If provider is not supported or doesn't have a separate vision model
   */
  getVisionModel(provider) {
    switch (provider) {
      case 'openai':
      case 'openai-standard':
      case 'azure-openai':
        return config.openai.visionModel;
      case 'claude':
        // Claude uses the same model for vision
        return config.claude.model;
      default:
        throw new Error(`Unsupported provider for vision model: ${provider}`);
    }
  },
};

/**
 * Default Options Utilities
 * Provides standardized default options for AI requests
 */
export const defaultOptions = {
  /**
   * Get default options for AI requests
   * @param {Object} overrides - Options to override defaults
   * @returns {Object} Options object with defaults applied
   */
  getDefaultOptions(overrides = {}) {
    return {
      temperature: 0.7,
      max_tokens: 4096,
      ...overrides,
    };
  },

  /**
   * Get default options for specific use cases
   * @param {string} useCase - Use case name ('creative', 'precise', 'structured', 'streaming')
   * @param {Object} overrides - Options to override defaults
   * @returns {Object} Options object with use-case-specific defaults
   */
  getUseCaseOptions(useCase = 'default', provider = null, overrides = {}) {
    const useCaseDefaults = {
      default: {
        temperature: 0.7,
        max_tokens: 4096,
      },
      creative: {
        temperature: 0.9,
        max_tokens: 2048,
      },
      precise: {
        temperature: 0.3,
        max_tokens: 4096,
      },
      structured: {
        temperature: 0.3,
        max_tokens: 4096,
        response_format: provider !== 'claude' ? { type: 'json_object' } : undefined,
      },
      streaming: {
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      },
      vision: {
        temperature: 0.7,
        max_tokens: 1024,
      },
    };

    const defaults = useCaseDefaults[useCase] || useCaseDefaults.default;
    return {
      ...defaults,
      ...overrides,
    };
  },
};

// Validate required API keys
if (!config.openai.azureApiKey && !config.openai.standardApiKey && !config.claude.apiKey) {
  console.warn(
    'Warning: No API keys found. Please set AZURE_OPENAI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env file'
  );
}
