import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';

/**
 * Streaming example - Real-time token streaming for better UX
 */
async function streamingExample() {
  console.log('=== Streaming Example ===\n');

  // OpenAI/Azure OpenAI Streaming
  if (config.openai.apiKey) {
    console.log('OpenAI Streaming Response:');
    console.log('---');

    const openaiClient = createAIClient('openai');
    const messages = [
      {
        role: 'user',
        content: 'Write a short story about an AI agent helping a startup.',
      },
    ];

    await openaiClient.chatStream(messages, (chunk) => {
      process.stdout.write(chunk);
    });

    console.log('\n---\n');
  }

  // Claude Streaming
  if (config.claude.apiKey) {
    console.log('Claude Streaming Response:');
    console.log('---');

    const claudeClient = createAIClient('claude');
    const messages = [
      {
        role: 'user',
        content: 'Write a short story about an AI agent helping a startup.',
      },
    ];

    await claudeClient.chatStream(messages, (chunk) => {
      process.stdout.write(chunk);
    });

    console.log('\n---\n');
  }
}

// Run the example
streamingExample().catch(console.error);
