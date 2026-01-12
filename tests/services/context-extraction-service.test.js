import { test } from 'node:test';
import assert from 'node:assert';
import { ContextExtractionService } from '../../src/services/context-extraction-service.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('ContextExtractionService - constructor with explicit provider', () => {
  const service = new ContextExtractionService('mock');
  assert.strictEqual(service.provider, 'mock');
  assert.ok(service.client);
});

test('ContextExtractionService - filter messages excludes system messages', () => {
  const service = new ContextExtractionService('mock');

  const messages = [
    { role: 'system', content: 'System message' },
    { role: 'user', content: 'User message' },
    { role: 'assistant', content: 'Assistant message' },
  ];

  const filtered = service.filterMessages(messages, { includeSystemMessages: false });

  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered[0].role, 'user');
  assert.strictEqual(filtered[1].role, 'assistant');
});

test('ContextExtractionService - filter messages includes system messages when requested', () => {
  const service = new ContextExtractionService('mock');

  const messages = [
    { role: 'system', content: 'System message' },
    { role: 'user', content: 'User message' },
  ];

  const filtered = service.filterMessages(messages, { includeSystemMessages: true });

  assert.strictEqual(filtered.length, 2);
  assert.ok(filtered.some((m) => m.role === 'system'));
});

test('ContextExtractionService - filter messages excludes tool messages', () => {
  const service = new ContextExtractionService('mock');

  const messages = [
    { role: 'user', content: 'User message' },
    { role: 'tool', content: 'Tool message' },
    { role: 'assistant', content: 'Assistant message' },
  ];

  const filtered = service.filterMessages(messages);

  assert.strictEqual(filtered.length, 2);
  assert.ok(!filtered.some((m) => m.role === 'tool'));
});

test('ContextExtractionService - filter messages excludes tool calls when enabled', () => {
  const service = new ContextExtractionService('mock');

  const messages = [
    { role: 'user', content: 'User message' },
    {
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'test' } }],
    },
  ];

  const filtered = service.filterMessages(messages, { filterToolCalls: true });

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].role, 'user');
});

test('ContextExtractionService - getMessageContent handles string content', () => {
  const service = new ContextExtractionService('mock');

  const message = { role: 'user', content: 'Simple text' };
  const content = service.getMessageContent(message);

  assert.strictEqual(content, 'Simple text');
});

test('ContextExtractionService - getMessageContent handles array content', () => {
  const service = new ContextExtractionService('mock');

  const message = {
    role: 'assistant',
    content: [
      { type: 'text', text: 'First part' },
      { type: 'text', text: 'Second part' },
    ],
  };
  const content = service.getMessageContent(message);

  assert.ok(content.includes('First part'));
  assert.ok(content.includes('Second part'));
});

test('ContextExtractionService - combineMessages formats correctly', () => {
  const service = new ContextExtractionService('mock');

  const messages = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
  ];

  const combined = service.combineMessages(messages);

  assert.ok(combined.includes('User: Hello'));
  assert.ok(combined.includes('Assistant: Hi there'));
});

test('ContextExtractionService - extractRelevantContext with mock client', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async () => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({ indices: [0, 2] }),
            },
          },
        ],
      };
    },
  });

  const service = new ContextExtractionService('mock');
  service.client = mockClient;

  const chatHistory = [
    { role: 'user', content: 'First message' },
    { role: 'assistant', content: 'Response' },
    { role: 'user', content: 'Second message' },
  ];

  const result = await service.extractRelevantContext(chatHistory, 'Extract user messages');

  assert.ok(result.context);
  assert.strictEqual(result.messageCount, 2);
  assert.ok(typeof result.totalLength === 'number');
});

test('ContextExtractionService - extractRelevantContext respects maxContextLength', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async () => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({ indices: [0, 1, 2] }),
            },
          },
        ],
      };
    },
  });

  const service = new ContextExtractionService('mock');
  service.client = mockClient;

  const chatHistory = [
    { role: 'user', content: 'A'.repeat(500) },
    { role: 'assistant', content: 'B'.repeat(500) },
    { role: 'user', content: 'C'.repeat(500) },
  ];

  const result = await service.extractRelevantContext(chatHistory, 'Goal', {
    maxContextLength: 100,
  });

  assert.ok(result.totalLength <= 100);
});

test('ContextExtractionService - extractRelevantContext handles empty history', async () => {
  const service = new ContextExtractionService('mock');

  const result = await service.extractRelevantContext([], 'Goal');

  assert.strictEqual(result.messageCount, 0);
  assert.strictEqual(result.totalLength, 0);
});

test('ContextExtractionService - extractRelevantContext handles LLM error gracefully', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async () => {
      throw new Error('LLM error');
    },
  });

  const service = new ContextExtractionService('mock');
  service.client = mockClient;

  const chatHistory = [
    { role: 'user', content: 'Message 1' },
    { role: 'assistant', content: 'Response 1' },
  ];

  // Should fallback to returning all filtered messages
  const result = await service.extractRelevantContext(chatHistory, 'Goal');

  assert.ok(result.messageCount > 0);
});

test('ContextExtractionService - extractTemplateContext', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async (messages) => {
      // Return the last user message which should contain the extracted context
      const lastMessage = messages[messages.length - 1];
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: lastMessage.content.includes('Template') ? 'Extracted context' : 'Response',
            },
          },
        ],
      };
    },
  });

  const service = new ContextExtractionService('mock');
  service.client = mockClient;

  const chatHistory = [
    { role: 'user', content: 'User message 1' },
    { role: 'assistant', content: 'Response 1' },
  ];

  const result = await service.extractTemplateContext(chatHistory, 'Template description');

  assert.ok(typeof result === 'string');
});

test('ContextExtractionService - extractTemplateContext returns empty string for no matches', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async () => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '""',
            },
          },
        ],
      };
    },
  });

  const service = new ContextExtractionService('mock');
  service.client = mockClient;

  const result = await service.extractTemplateContext([], 'Template description');

  assert.strictEqual(result, '');
});
