/**
 * Logger Example
 *
 * Demonstrates the structured logger utility
 */

import { createLogger } from '../utils/logger.js';

async function loggerExample() {
  console.log('=== Structured Logger Example ===\n');

  // Create logger instances for different contexts
  const appLogger = createLogger('App');
  const agentLogger = createLogger('FunctionCallingAgent');
  const apiLogger = createLogger('APIClient');

  // Different log levels
  console.log('1️⃣ Log Levels:');
  console.log('-'.repeat(60));
  appLogger.debug('Debug message - detailed information');
  appLogger.info('Info message - general information');
  appLogger.warn('Warning message - potential issues');
  appLogger.error('Error message - something went wrong');

  console.log('\n2️⃣ Logging with Metadata:');
  console.log('-'.repeat(60));
  agentLogger.info('Function registered', {
    name: 'sendEmail',
    description: 'Send an email to a recipient',
    parameters: ['to', 'subject', 'body'],
  });

  apiLogger.info('API request completed', {
    endpoint: '/chat/completions',
    method: 'POST',
    statusCode: 200,
    duration: 245,
    tokens: { input: 150, output: 75 },
  });

  console.log('\n3️⃣ Error Logging:');
  console.log('-'.repeat(60));
  try {
    throw new Error('API rate limit exceeded');
  } catch (error) {
    apiLogger.error('API request failed', error);
  }

  console.log('\n4️⃣ Child Loggers:');
  console.log('-'.repeat(60));
  const childLogger = agentLogger.child('ToolExecution');
  childLogger.info('Tool executed successfully', {
    tool: 'calculator',
    result: 42,
  });

  console.log('\n5️⃣ Environment Configuration:');
  console.log('-'.repeat(60));
  console.log('Set LOG_LEVEL environment variable to control logging:');
  console.log('  - LOG_LEVEL=DEBUG - Show all logs');
  console.log('  - LOG_LEVEL=INFO - Show info, warn, error (default)');
  console.log('  - LOG_LEVEL=WARN - Show only warnings and errors');
  console.log('  - LOG_LEVEL=ERROR - Show only errors');
  console.log('  - LOG_LEVEL=NONE - Disable all logging');
  console.log('\nSet LOG_FORMAT=json for JSON output format');
}

loggerExample().catch(console.error);
