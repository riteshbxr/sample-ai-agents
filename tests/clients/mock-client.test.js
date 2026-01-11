import { test } from 'node:test';
import assert from 'node:assert';
import { MockAIClient } from '../../src/clients/mock-client.js';
import { implementsAIClientInterface } from '../../src/clients/ai-client-interface.js';

test('MockAIClient implements AIClientInterface', () => {
  const mockClient = new MockAIClient();
  assert.strictEqual(implementsAIClientInterface(mockClient), true);
});

test('MockAIClient - basic chat', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'Hello, this is a test response',
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);
  const text = mockClient.getTextContent(response);

  assert.strictEqual(text, 'Hello, this is a test response');
  assert.ok(response.choices || response.content);
});

test('MockAIClient - custom chat handler', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async (messages) => {
      const lastMessage = messages[messages.length - 1].content;
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: `Echo: ${lastMessage}`,
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
    },
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Test message' }]);
  const text = mockClient.getTextContent(response);

  assert.strictEqual(text, 'Echo: Test message');
});

test('MockAIClient - streaming', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'Streaming test response',
  });

  const chunks = [];
  const fullText = await mockClient.chatStream(
    [{ role: 'user', content: 'Stream me' }],
    (chunk) => {
      chunks.push(chunk);
    }
  );

  assert.strictEqual(fullText, 'Streaming test response');
  assert.ok(chunks.length > 0);
});

test('MockAIClient - tool calling', async () => {
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

  assert.strictEqual(mockClient.hasToolUse(response), true);
  const toolCalls = mockClient.getToolUseBlocks(response);
  assert.ok(toolCalls.length > 0);
  assert.strictEqual(toolCalls[0].function?.name || toolCalls[0].name, 'get_weather');
});

test('MockAIClient - embeddings', async () => {
  const mockClient = new MockAIClient();

  const embeddings = await mockClient.getEmbeddings(['Hello', 'World']);

  assert.strictEqual(embeddings.length, 2);
  assert.strictEqual(embeddings[0].length, 1536);
  assert.strictEqual(embeddings[1].length, 1536);
});

test('MockAIClient - error simulation', async () => {
  const mockClient = new MockAIClient({
    simulateErrors: true,
  });

  await assert.rejects(
    async () => {
      await mockClient.chat([{ role: 'user', content: 'Test' }]);
    },
    {
      message: 'Mock error: Simulated API error',
    }
  );
});

test('MockAIClient - call history tracking', async () => {
  const mockClient = new MockAIClient();

  await mockClient.chat([{ role: 'user', content: 'Message 1' }]);
  await mockClient.chat([{ role: 'user', content: 'Message 2' }]);
  await mockClient.getEmbeddings(['test']);

  const history = mockClient.getCallHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].method, 'chat');
  assert.strictEqual(history[1].method, 'chat');
  assert.strictEqual(history[2].method, 'getEmbeddings');

  mockClient.clearCallHistory();
  assert.strictEqual(mockClient.getCallHistory().length, 0);
});

test('MockAIClient - Claude response format', async () => {
  const mockClient = new MockAIClient({
    responseFormat: 'claude',
    defaultResponse: 'Claude-style response',
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);

  assert.ok(response.content);
  assert.strictEqual(mockClient.getTextContent(response), 'Claude-style response');
});

test('MockAIClient - reset functionality', () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'Custom response',
    simulateErrors: true,
  });

  mockClient.reset();

  assert.strictEqual(mockClient.defaultResponse, 'Mock response');
  assert.strictEqual(mockClient.simulateErrors, false);
  assert.strictEqual(mockClient.getCallHistory().length, 0);
});
