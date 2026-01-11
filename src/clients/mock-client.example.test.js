/**
 * Mock Client Usage Examples
 *
 * This file demonstrates how to use MockAIClient in tests.
 * Note: This is an example file - actual test frameworks would use their own syntax.
 */

import { MockAIClient } from './mock-client.js';
import { implementsAIClientInterface } from './ai-client-interface.js';

// Example 1: Basic usage
// eslint-disable-next-line no-unused-vars
async function basicUsageExample() {
  const mockClient = new MockAIClient({
    defaultResponse: 'Hello, this is a mock response!',
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);

  const text = mockClient.getTextContent(response);
  console.log('Response:', text); // "Hello, this is a mock response!"
}

// Example 2: Custom response handler
// eslint-disable-next-line no-unused-vars
async function customHandlerExample() {
  const mockClient = new MockAIClient({
    // eslint-disable-next-line no-unused-vars
    chatHandler: async (messages, options) => {
      const lastMessage = messages[messages.length - 1].content;
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: `You said: "${lastMessage}"`,
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
    },
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Test message' }]);
  console.log('Custom response:', mockClient.getTextContent(response));
}

// Example 3: Tool calling
// eslint-disable-next-line no-unused-vars
async function toolCallingExample() {
  const mockClient = new MockAIClient();

  const tools = [
    {
      name: 'get_weather',
      description: 'Get weather information',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
        },
      },
    },
  ];

  const response = await mockClient.chatWithTools(
    [{ role: 'user', content: 'What is the weather?' }],
    tools
  );

  console.log('Has tool use:', mockClient.hasToolUse(response)); // true
  console.log('Tool calls:', mockClient.getToolUseBlocks(response));
}

// Example 4: Streaming
// eslint-disable-next-line no-unused-vars
async function streamingExample() {
  const mockClient = new MockAIClient({
    defaultResponse: 'This is a streaming response',
  });

  const chunks = [];
  await mockClient.chatStream([{ role: 'user', content: 'Stream me' }], (chunk) => {
    chunks.push(chunk);
    process.stdout.write(chunk);
  });
  console.log('\nTotal chunks:', chunks.length);
}

// Example 5: Embeddings
// eslint-disable-next-line no-unused-vars
async function embeddingsExample() {
  const mockClient = new MockAIClient();

  const embeddings = await mockClient.getEmbeddings(['Hello', 'World']);
  console.log('Embeddings count:', embeddings.length); // 2
  console.log('Embedding dimension:', embeddings[0].length); // 1536
}

// Example 6: Error simulation
// eslint-disable-next-line no-unused-vars
async function errorSimulationExample() {
  const mockClient = new MockAIClient({
    simulateErrors: true,
  });

  try {
    await mockClient.chat([{ role: 'user', content: 'Test' }]);
  } catch (error) {
    console.log('Caught error:', error.message); // "Mock error: Simulated API error"
  }
}

// Example 7: Call history tracking
// eslint-disable-next-line no-unused-vars
async function callHistoryExample() {
  const mockClient = new MockAIClient();

  await mockClient.chat([{ role: 'user', content: 'Message 1' }]);
  await mockClient.chat([{ role: 'user', content: 'Message 2' }]);
  await mockClient.getEmbeddings(['test']);

  const history = mockClient.getCallHistory();
  console.log('Call count:', history.length); // 3
  console.log(
    'Methods called:',
    history.map((call) => call.method)
  );
  // ['chat', 'chat', 'getEmbeddings']

  mockClient.clearCallHistory();
  console.log('After clear:', mockClient.getCallHistory().length); // 0
}

// Example 8: Interface validation
// eslint-disable-next-line no-unused-vars
function interfaceValidationExample() {
  const mockClient = new MockAIClient();
  console.log('Implements interface:', implementsAIClientInterface(mockClient)); // true
}

// Example 9: Claude response format
// eslint-disable-next-line no-unused-vars
async function claudeFormatExample() {
  const mockClient = new MockAIClient({
    responseFormat: 'claude',
    defaultResponse: 'Claude-style response',
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);

  // Response will be in Claude format
  console.log('Response format:', response.content ? 'Claude' : 'OpenAI');
  console.log('Text:', mockClient.getTextContent(response));
}

// Run examples (commented out to avoid execution in non-test environment)
// Uncomment to run:
// basicUsageExample();
// customHandlerExample();
// toolCallingExample();
// streamingExample();
// embeddingsExample();
// errorSimulationExample();
// callHistoryExample();
// interfaceValidationExample();
// claudeFormatExample();
