import { ChatService } from '../../services/chat-service.js';
import { config } from '../../config.js';

/**
 * Simple chat example - Basic usage of OpenAI and Claude
 */
async function simpleChatExample() {
  console.log('=== Simple Chat Example ===\n');

  // Example with OpenAI/Azure OpenAI
  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    console.log('Using OpenAI...');
    const chatService = new ChatService('openai');

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: 'What are the latest trends in AI for tech startups?',
      },
    ];

    const response = await chatService.chat(messages);
    console.log('OpenAI Response:');
    console.log(response.content);
    console.log('\n');
  }

  // Example with Claude
  if (config.claude.apiKey) {
    console.log('Using Claude...');
    const chatService = new ChatService('claude');

    const messages = [
      {
        role: 'user',
        content: 'What are the latest trends in AI for tech startups?',
      },
    ];

    const response = await chatService.chat(messages);
    console.log('Claude Response:');
    console.log(response.content);
    console.log('\n');
  }
}

// Run the example
simpleChatExample().catch(console.error);
