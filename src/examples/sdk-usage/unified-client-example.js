/**
 * Unified Client Interface Example
 *
 * Demonstrates how to use the unified AIClientInterface to work with
 * both OpenAI and Claude clients interchangeably.
 */

import { createAIClient } from '../../clients/client-factory.js';
import { implementsAIClientInterface } from '../../clients/ai-client-interface.js';
import { OpenAIClient } from '../../clients/openai-client.js';
import { ClaudeClient } from '../../clients/claude-client.js';

/**
 * Example 1: Using the factory function to create clients
 */
async function factoryExample() {
  console.log('=== Factory Function Example ===\n');

  // Create OpenAI client
  const openaiClient = createAIClient('openai');
  console.log('✅ Created OpenAI client');

  // Create Claude client
  const claudeClient = createAIClient('claude');
  console.log('✅ Created Claude client\n');
}

/**
 * Example 2: Using clients interchangeably with the same interface
 */
async function unifiedInterfaceExample() {
  console.log('=== Unified Interface Example ===\n');

  // Both clients implement the same interface
  const provider =
    process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY ? 'openai' : 'claude';

  const client = createAIClient(provider);
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  // All methods work the same way regardless of provider
  const messages = [{ role: 'user', content: 'Say hello in one sentence' }];

  // 1. Basic chat - same interface
  console.log('1. Basic Chat:');
  const response = await client.chat(messages);
  const text = client.getTextContent(response);
  console.log(`   Response: ${text}\n`);

  // 2. Streaming - same interface
  console.log('2. Streaming:');
  await client.chatStream(messages, (chunk) => {
    process.stdout.write(chunk);
  });
  console.log('\n');

  // 3. Tool/Function calling - same interface
  console.log('3. Tool Calling:');
  const tools = [
    {
      name: 'get_weather',
      description: 'Get the current weather',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
        },
        required: ['location'],
      },
    },
  ];

  const toolResponse = await client.chatWithTools(
    [{ role: 'user', content: 'What is the weather in San Francisco?' }],
    tools
  );

  // Check if tools were used
  if (client.hasToolUse(toolResponse)) {
    const toolCalls = client.getToolUseBlocks(toolResponse);
    console.log(`   Tools called: ${toolCalls.length}`);
  } else {
    const text = client.getTextContent(toolResponse);
    console.log(`   Response: ${text}`);
  }
  console.log();
}

/**
 * Example 3: Provider-specific features
 */
async function providerSpecificExample() {
  console.log('=== Provider-Specific Features ===\n');

  // OpenAI-specific: Embeddings
  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAIClient();

    try {
      const embeddings = await openaiClient.getEmbeddings(['Hello world']);
      console.log('✅ OpenAI embeddings:', embeddings[0].slice(0, 5), '...');
    } catch (error) {
      console.log('❌ Embeddings error:', error.message);
    }
  }

  // Claude-specific: No embeddings support
  if (process.env.ANTHROPIC_API_KEY) {
    const claudeClient = new ClaudeClient();

    try {
      await claudeClient.getEmbeddings(['Hello world']);
    } catch (error) {
      console.log('✅ Claude correctly indicates no embeddings support:', error.message);
    }
  }
  console.log();
}

/**
 * Example 4: Interface validation
 */
async function interfaceValidationExample() {
  console.log('=== Interface Validation ===\n');

  const openaiClient = new OpenAIClient();
  const claudeClient = new ClaudeClient();

  console.log('OpenAI client implements interface:', implementsAIClientInterface(openaiClient));
  console.log('Claude client implements interface:', implementsAIClientInterface(claudeClient));
  console.log();
}

/**
 * Example 5: Switching providers dynamically
 */
async function dynamicProviderExample() {
  console.log('=== Dynamic Provider Switching ===\n');

  const providers = [];
  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    providers.push('openai');
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push('claude');
  }

  if (providers.length === 0) {
    console.log('⚠️  No API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
    return;
  }

  // Use the same code with different providers
  for (const provider of providers) {
    console.log(`\nUsing ${provider.toUpperCase()}:`);
    const client = createAIClient(provider);

    const response = await client.chat([
      { role: 'user', content: 'Say "Hello from ' + provider + '"' },
    ]);

    const text = client.getTextContent(response);
    console.log(`  Response: ${text}`);
  }
  console.log();
}

/**
 * Main example function
 */
async function unifiedClientExample() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Unified AI Client Interface Example                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    // Example 1: Factory function
    await factoryExample();

    // Example 2: Unified interface
    await unifiedInterfaceExample();

    // Example 3: Provider-specific features
    await providerSpecificExample();

    // Example 4: Interface validation
    await interfaceValidationExample();

    // Example 5: Dynamic provider switching
    await dynamicProviderExample();

    console.log('✅ All unified client examples completed!');
    console.log('\n💡 Key Benefits:');
    console.log('  - Same API for OpenAI and Claude');
    console.log('  - Easy provider switching');
    console.log('  - Type-safe interface');
    console.log('  - Consistent method names');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  unifiedClientExample().catch(console.error);
}

export { unifiedClientExample };
