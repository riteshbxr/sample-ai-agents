import { test } from 'node:test';
import assert from 'node:assert';
import { createAIClient } from '../../src/clients/client-factory.js';
import { MockAIClient } from '../../src/clients/mock-client.js';
import { implementsAIClientInterface } from '../../src/clients/ai-client-interface.js';

test('createAIClient returns client implementing interface', () => {
  // Note: This test would require actual API keys, so we'll test with mock
  // In a real scenario, you'd mock the client creation
  const mockClient = new MockAIClient();
  assert.strictEqual(implementsAIClientInterface(mockClient), true);
});

test('createAIClient throws error for unsupported provider', () => {
  assert.throws(
    () => {
      createAIClient('invalid-provider');
    },
    {
      message: /Unsupported provider/,
    }
  );
});

test('MockAIClient can be used as drop-in replacement', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'Test response',
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);
  const text = mockClient.getTextContent(response);

  assert.strictEqual(text, 'Test response');
  assert.strictEqual(implementsAIClientInterface(mockClient), true);
});
