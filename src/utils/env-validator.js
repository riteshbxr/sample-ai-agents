/**
 * Environment Validator
 *
 * Validates environment configuration and provides clear error messages
 * for missing or invalid configuration.
 */

import { config } from '../config.js';

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - List of error messages
 * @property {string[]} warnings - List of warning messages
 * @property {Object} providers - Available providers status
 */

/**
 * @typedef {Object} ProviderStatus
 * @property {boolean} available - Whether provider is configured
 * @property {string[]} missing - Missing configuration keys
 */

/**
 * Validate environment configuration
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.requireAtLeastOne=true] - Require at least one provider
 * @param {string[]} [options.requiredProviders=[]] - Specific providers that must be available
 * @returns {ValidationResult} Validation result
 */
export function validateEnvironment(options = {}) {
  const { requireAtLeastOne = true, requiredProviders = [] } = options;

  const errors = [];
  const warnings = [];
  const providers = {
    'azure-openai': validateAzureOpenAI(),
    'openai-standard': validateStandardOpenAI(),
    claude: validateClaude(),
    langfuse: validateLangfuse(),
    chroma: validateChroma(),
  };

  // Check if at least one AI provider is available
  const aiProviders = ['azure-openai', 'openai-standard', 'claude'];
  const availableAIProviders = aiProviders.filter((p) => providers[p].available);

  if (requireAtLeastOne && availableAIProviders.length === 0) {
    errors.push(
      'No AI provider configured. Please set at least one of:\n' +
        '  - AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT (for Azure OpenAI)\n' +
        '  - OPENAI_API_KEY (for standard OpenAI)\n' +
        '  - ANTHROPIC_API_KEY (for Claude)'
    );
  }

  // Check required providers
  for (const provider of requiredProviders) {
    if (!providers[provider]?.available) {
      const missing = providers[provider]?.missing || ['unknown configuration'];
      errors.push(
        `Required provider '${provider}' is not configured. Missing: ${missing.join(', ')}`
      );
    }
  }

  // Add warnings for partial configurations
  if (config.openai.azureApiKey && !config.openai.azure.endpoint) {
    warnings.push(
      'AZURE_OPENAI_API_KEY is set but AZURE_OPENAI_ENDPOINT is missing. Azure OpenAI will not work.'
    );
  }

  if (config.openai.azure.endpoint && !config.openai.azureApiKey) {
    warnings.push(
      'AZURE_OPENAI_ENDPOINT is set but AZURE_OPENAI_API_KEY is missing. Azure OpenAI will not work.'
    );
  }

  // Check for deprecated or problematic configurations
  if (process.env.OPENAI_MODEL && !process.env.AZURE_OPENAI_DEPLOYMENT) {
    warnings.push(
      'OPENAI_MODEL is set but AZURE_OPENAI_DEPLOYMENT is not. ' +
        'For Azure OpenAI, use AZURE_OPENAI_DEPLOYMENT instead.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    providers,
  };
}

/**
 * Validate Azure OpenAI configuration
 * @returns {ProviderStatus} Provider status
 */
function validateAzureOpenAI() {
  const missing = [];

  if (!config.openai.azureApiKey) {
    missing.push('AZURE_OPENAI_API_KEY');
  }
  if (!config.openai.azure.endpoint) {
    missing.push('AZURE_OPENAI_ENDPOINT');
  }

  return {
    available: missing.length === 0,
    missing,
  };
}

/**
 * Validate Standard OpenAI configuration
 * @returns {ProviderStatus} Provider status
 */
function validateStandardOpenAI() {
  const missing = [];

  if (!config.openai.standardApiKey) {
    missing.push('OPENAI_API_KEY');
  }

  return {
    available: missing.length === 0,
    missing,
  };
}

/**
 * Validate Claude configuration
 * @returns {ProviderStatus} Provider status
 */
function validateClaude() {
  const missing = [];

  if (!config.claude.apiKey) {
    missing.push('ANTHROPIC_API_KEY');
  }

  return {
    available: missing.length === 0,
    missing,
  };
}

/**
 * Validate Langfuse configuration
 * @returns {ProviderStatus} Provider status
 */
function validateLangfuse() {
  const missing = [];

  if (!config.langfuse.secretKey) {
    missing.push('LANGFUSE_SECRET_KEY');
  }
  if (!config.langfuse.publicKey) {
    missing.push('LANGFUSE_PUBLIC_KEY');
  }

  return {
    available: missing.length === 0,
    missing,
  };
}

/**
 * Validate ChromaDB configuration
 * @returns {ProviderStatus} Provider status
 */
function validateChroma() {
  // ChromaDB has a default, so it's always "available"
  return {
    available: true,
    missing: [],
  };
}

/**
 * Assert that environment is valid, throwing an error if not
 * @param {Object} [options={}] - Validation options
 * @throws {Error} If validation fails
 */
export function assertValidEnvironment(options = {}) {
  const result = validateEnvironment(options);

  if (!result.valid) {
    const errorMessage = [
      'Environment validation failed:',
      '',
      ...result.errors.map((e) => `  ❌ ${e}`),
      '',
      'Please check your .env file and ensure required environment variables are set.',
      'See env.example for a template.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('Environment warnings:');
    result.warnings.forEach((w) => console.warn(`  ⚠️  ${w}`));
  }

  return result;
}

/**
 * Print environment status to console
 * Useful for debugging configuration issues
 */
export function printEnvironmentStatus() {
  const result = validateEnvironment({ requireAtLeastOne: false });

  console.log('\n📋 Environment Configuration Status\n');
  console.log('='.repeat(50));

  // AI Providers
  console.log('\n🤖 AI Providers:\n');

  const providerNames = {
    'azure-openai': 'Azure OpenAI',
    'openai-standard': 'Standard OpenAI',
    claude: 'Claude (Anthropic)',
  };

  for (const [key, name] of Object.entries(providerNames)) {
    const status = result.providers[key];
    if (status.available) {
      console.log(`  ✅ ${name}: Configured`);
    } else {
      console.log(`  ❌ ${name}: Not configured (missing: ${status.missing.join(', ')})`);
    }
  }

  // Optional Services
  console.log('\n📊 Optional Services:\n');

  const langfuseStatus = result.providers.langfuse;
  if (langfuseStatus.available) {
    console.log(`  ✅ Langfuse: Configured`);
  } else {
    console.log(`  ⚪ Langfuse: Not configured (optional)`);
  }

  console.log(`  ✅ ChromaDB: Using ${config.chroma.persistDirectory}`);

  // Warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:\n');
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:\n');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log(`\n${'='.repeat(50)}\n`);

  return result;
}
