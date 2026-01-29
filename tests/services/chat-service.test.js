import { test } from 'node:test';
import assert from 'node:assert';
import { ChatService } from '../../src/services/chat-service.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('ChatService - constructor with explicit provider', () => {
  const service = new ChatService('mock');
  assert.strictEqual(service.provider, 'mock');
  assert.ok(service.client);
});

test('ChatService - basic chat', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'Hello from AI',
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const messages = [{ role: 'user', content: 'Hello' }];
  const response = await service.chat(messages);

  assert.ok(response.content);
  assert.strictEqual(response.content, 'Hello from AI');
  assert.strictEqual(response.provider, 'mock');
});

test('ChatService - chat with options', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async (messages, options) => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: `Temperature: ${options.temperature}`,
            },
          },
        ],
      };
    },
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const messages = [{ role: 'user', content: 'Test' }];
  const response = await service.chat(messages, { temperature: 0.7 });

  assert.strictEqual(response.content, 'Temperature: 0.7');
});

test('ChatService - streaming chat', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'Streaming response',
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const chunks = [];
  const messages = [{ role: 'user', content: 'Stream test' }];

  const fullText = await service.chatStream(messages, (chunk) => {
    chunks.push(chunk);
  });

  assert.strictEqual(fullText.trim(), 'Streaming response');
  assert.ok(chunks.length > 0);
});

test('ChatService - chat with tools', async () => {
  const mockClient = new MockAIClient({
    chatWithToolsHandler: async (_messages, _tools) => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: JSON.stringify({ location: 'San Francisco' }),
                  },
                },
              ],
            },
          },
        ],
      };
    },
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const messages = [{ role: 'user', content: 'What is the weather?' }];
  const tools = [
    {
      name: 'get_weather',
      description: 'Get weather',
      parameters: { type: 'object', properties: { location: { type: 'string' } } },
    },
  ];

  const response = await service.client.chatWithTools(messages, tools);

  assert.ok(service.client.hasToolUse(response));
  assert.ok(service.client.getToolUseBlocks(response).length > 0);
});

test('ChatService - structured output', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async (_messages, _options) => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({ name: 'John', age: 30 }),
            },
          },
        ],
      };
    },
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const messages = [{ role: 'user', content: 'Extract person info' }];
  const options = {
    temperature: 0,
  };

  const result = await service.getStructuredOutput(messages, options);

  assert.deepStrictEqual(result, { name: 'John', age: 30 });
});

test('ChatService - structured output with invalid JSON', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async () => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'not valid json',
            },
          },
        ],
      };
    },
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const messages = [{ role: 'user', content: 'Extract info' }];
  const schema = { type: 'object' };

  await assert.rejects(
    async () => {
      await service.getStructuredOutput(messages, schema);
    },
    {
      message: /Failed to parse JSON response/,
    }
  );
});

test('ChatService - extract structured data', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async (_messages) => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
            },
          },
        ],
      };
    },
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const text = 'Contact: Alice, email: alice@example.com';
  const schema = ['name', 'email'];

  const result = await service.extractStructuredData(text, schema);

  assert.ok(result.name);
  assert.ok(result.email);
});

test('ChatService - extract structured data with string schema', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async () => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({ product: 'Laptop', price: 999 }),
            },
          },
        ],
      };
    },
  });

  const service = new ChatService('mock');
  service.client = mockClient;

  const text = 'Product: Laptop, Price: $999';
  const schema = 'Extract product name and price';

  const result = await service.extractStructuredData(text, schema);

  assert.ok(result.product || result.price);
});

test('ChatService - get text content', () => {
  const mockClient = new MockAIClient();
  const service = new ChatService('mock');
  service.client = mockClient;

  const openaiResponse = {
    choices: [{ message: { role: 'assistant', content: 'OpenAI text' } }],
  };

  const claudeResponse = {
    content: [{ type: 'text', text: 'Claude text' }],
  };

  // Mock client needs to be configured for Claude format
  const claudeMockClient = new MockAIClient({ responseFormat: 'claude' });

  assert.strictEqual(mockClient.getTextContent(openaiResponse), 'OpenAI text');
  assert.strictEqual(claudeMockClient.getTextContent(claudeResponse), 'Claude text');
});
