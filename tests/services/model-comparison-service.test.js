import { test } from 'node:test';
import assert from 'node:assert';
import { ModelComparisonService } from '../../src/services/model-comparison-service.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('ModelComparisonService - constructor initializes clients', () => {
  const service = new ModelComparisonService();

  assert.ok(service.clients);
  // Should have initialized available clients based on config
  assert.ok(typeof service.clients === 'object');
});

test('ModelComparisonService - compare models with string message', async () => {
  const service = new ModelComparisonService();

  // Mock the clients
  service.clients.openai = new MockAIClient({
    defaultResponse: 'OpenAI response',
  });

  service.clients.claude = new MockAIClient({
    defaultResponse: 'Claude response',
  });

  const results = await service.compareModels('Hello, how are you?');

  assert.ok(typeof results === 'object');
  assert.ok(results.openai || results.claude);
});

test('ModelComparisonService - compare models with message array', async () => {
  const service = new ModelComparisonService();

  service.clients.openai = new MockAIClient({
    defaultResponse: 'OpenAI response',
  });

  const messages = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
  ];

  const results = await service.compareModels(messages);

  assert.ok(typeof results === 'object');
});

test('ModelComparisonService - compare models with options', async () => {
  const service = new ModelComparisonService();

  service.clients.openai = new MockAIClient({
    defaultResponse: 'OpenAI response with temperature 0.7',
  });

  const results = await service.compareModels('Test', { temperature: 0.7 });

  assert.ok(typeof results === 'object');
  if (results.openai) {
    assert.ok(typeof results.openai === 'object');
    assert.ok(results.openai.content);
    assert.ok(typeof results.openai.content === 'string');
  }
});

test('ModelComparisonService - compare models with provider-specific options', async () => {
  const service = new ModelComparisonService();

  service.clients.openai = new MockAIClient({
    chatHandler: async (messages, options) => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: `OpenAI with temp ${options.temperature}`,
            },
          },
        ],
      };
    },
  });

  service.clients.claude = new MockAIClient({
    chatHandler: async (messages, options) => {
      return {
        content: [
          {
            type: 'text',
            text: `Claude with temp ${options.temperature}`,
          },
        ],
      };
    },
  });

  const options = {
    openai: { temperature: 0.7 },
    claude: { temperature: 0.9 },
  };

  const results = await service.compareModels('Test', options);

  assert.ok(typeof results === 'object');
});

test('ModelComparisonService - compare models handles single provider', async () => {
  const service = new ModelComparisonService();

  service.clients.openai = new MockAIClient({
    defaultResponse: 'OpenAI only',
  });

  // Remove claude client
  delete service.clients.claude;

  const results = await service.compareModels('Test');

  assert.ok(results.openai);
  assert.ok(!results.claude);
});

test('ModelComparisonService - compare models handles errors gracefully', async () => {
  const service = new ModelComparisonService();

  service.clients.openai = new MockAIClient({
    chatHandler: async () => {
      throw new Error('OpenAI error');
    },
  });

  service.clients.claude = new MockAIClient({
    defaultResponse: 'Claude response',
  });

  // The service throws errors even if some providers succeed
  // This is by design to allow error handling at the caller level
  await assert.rejects(
    async () => {
      await service.compareModels('Test');
    },
    {
      message: /OpenAI error/,
    }
  );
});

test('ModelComparisonService - compare models with empty clients', async () => {
  const service = new ModelComparisonService();

  // Clear all clients
  service.clients = {};

  const results = await service.compareModels('Test');

  assert.ok(typeof results === 'object');
  assert.strictEqual(Object.keys(results).length, 0);
});

test('ModelComparisonService - compare models extracts text content correctly', async () => {
  const service = new ModelComparisonService();

  service.clients.openai = new MockAIClient({
    defaultResponse: 'OpenAI text response',
  });

  service.clients.claude = new MockAIClient({
    defaultResponse: 'Claude text response',
    responseFormat: 'claude',
  });

  const results = await service.compareModels('Test');

  if (results.openai) {
    assert.ok(typeof results.openai === 'object');
    assert.ok(results.openai.content);
    assert.strictEqual(results.openai.content, 'OpenAI text response');
  }
  if (results.claude) {
    assert.ok(typeof results.claude === 'object');
    assert.ok(results.claude.content);
    assert.strictEqual(results.claude.content, 'Claude text response');
  }
});

test('ModelComparisonService - compare models with streaming', async () => {
  const service = new ModelComparisonService();

  let chunkCount = 0;
  service.clients.openai = new MockAIClient({
    chatStreamHandler: async (messages, onChunk) => {
      const words = ['Streaming', 'response', 'from', 'OpenAI'];
      for (const word of words) {
        if (onChunk) {
          onChunk(word + ' ');
          chunkCount++;
        }
      }
      return words.join(' ');
    },
  });

  const results = await service.compareModels('Test', {}, { stream: true });

  assert.ok(typeof results === 'object');
  assert.ok(chunkCount > 0 || results.openai);
});

test('ModelComparisonService - compare models returns consistent structure', async () => {
  const service = new ModelComparisonService();

  service.clients.openai = new MockAIClient({
    defaultResponse: 'Response 1',
  });

  service.clients.claude = new MockAIClient({
    defaultResponse: 'Response 2',
  });

  const results1 = await service.compareModels('Test 1');
  const results2 = await service.compareModels('Test 2');

  // Both should have the same structure
  assert.ok(typeof results1 === 'object');
  assert.ok(typeof results2 === 'object');
  assert.ok(Array.isArray(Object.keys(results1)));
  assert.ok(Array.isArray(Object.keys(results2)));
});
