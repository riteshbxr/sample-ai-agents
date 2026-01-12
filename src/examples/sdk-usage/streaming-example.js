import { ChatService } from '../../services/chat-service.js';
import { config } from '../../config.js';

/**
 * Streaming example - Real-time token streaming for better UX
 */
async function streamingExample() {
  console.log('=== Streaming Example ===\n');

  // OpenAI/Azure OpenAI Streaming
  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    console.log('OpenAI Streaming Response:');
    console.log('---');

    const chatService = new ChatService('openai');
    const messages = [
      {
        role: 'user',
        content: 'Write a short story about an AI agent helping a startup.',
      },
    ];

    await chatService.chatStream(messages, (chunk) => {
      process.stdout.write(chunk);
    });

    console.log('\n---\n');
  }

  // Claude Streaming
  if (config.claude.apiKey) {
    console.log('Claude Streaming Response:');
    console.log('---');

    const chatService = new ChatService('claude');
    const messages = [
      {
        role: 'user',
        content: 'Write a short story about an AI agent helping a startup.',
      },
    ];

    await chatService.chatStream(messages, (chunk) => {
      process.stdout.write(chunk);
    });

    console.log('\n---\n');
  }
}

// Run the example
streamingExample().catch(console.error);
