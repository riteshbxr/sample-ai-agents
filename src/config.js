import dotenv from 'dotenv';

dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    // Separate access to standard OpenAI API key (for Assistants API which requires non-Azure)
    standardApiKey: process.env.OPENAI_API_KEY,
    azureApiKey: process.env.AZURE_OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-turbo-preview',
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
if (!config.openai.apiKey && !config.claude.apiKey) {
  console.warn(
    'Warning: No API keys found. Please set AZURE_OPENAI_API_KEY or ANTHROPIC_API_KEY in .env file'
  );
}
