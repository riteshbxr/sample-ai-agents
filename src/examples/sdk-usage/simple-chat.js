import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';

/**
 * Simple chat example - Basic usage of OpenAI and Claude
 */
async function simpleChatExample() {
  console.log('=== Simple Chat Example ===\n');

  // Example with OpenAI/Azure OpenAI
  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    console.log('Using OpenAI...');
    const openaiClient = createAIClient('openai');

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

    const response = await openaiClient.chat(messages);
    console.log('OpenAI Response:');
    console.log(openaiClient.getTextContent(response));
    console.log('\n');
  }

  // Example with Claude
  if (config.claude.apiKey) {
    console.log('Using Claude...');
    const claudeClient = createAIClient('claude');

    const messages = [
      {
        role: 'user',
        content: 'What are the latest trends in AI for tech startups?',
      },
    ];

    const response = await claudeClient.chat(messages);
    const textContent = claudeClient.getTextContent(response);
    console.log('Claude Response:');
    console.log(textContent);
    console.log('\n');
  }
}

// Run the example
simpleChatExample().catch(console.error);
