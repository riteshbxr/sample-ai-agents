import { test } from 'node:test';
import assert from 'node:assert';
import { CostTracker } from '../../src/examples/strategies/cost-tracking/cost-tracker.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('CostTracker - track request with mock client', async () => {
  const tracker = new CostTracker();
  const mockClient = new MockAIClient({
    defaultResponse: 'Test response',
  });

  // Simulate a chat request
  await mockClient.chat([{ role: 'user', content: 'Hello' }]);

  // Track the request
  const costData = {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
  };

  tracker.trackRequest('openai', 'mock-model', costData, {
    requestType: 'chat',
    timestamp: Date.now(),
  });

  const stats = tracker.getStats();
  assert.ok(stats.totalRequests > 0);
  assert.ok(stats.totalCost >= 0);
});

test('CostTracker - multiple requests tracking', async () => {
  const tracker = new CostTracker();
  const mockClient = new MockAIClient();

  // Simulate multiple requests
  for (let i = 0; i < 5; i++) {
    await mockClient.chat([{ role: 'user', content: `Message ${i}` }]);
    tracker.trackRequest('openai', 'mock-model', {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
  }

  const stats = tracker.getStats();
  assert.strictEqual(stats.totalRequests, 5);
});
