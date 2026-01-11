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

// Validate required API keys
if (!config.openai.azureApiKey && !config.openai.standardApiKey && !config.claude.apiKey) {
  console.warn(
    'Warning: No API keys found. Please set AZURE_OPENAI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env file'
  );
}
