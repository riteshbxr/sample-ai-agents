import { test } from 'node:test';
import assert from 'node:assert';
import { CostTracker } from '../../src/examples/strategies/cost-tracking/cost-tracker.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('CostTracker - track request with mock client using calculateCost', async () => {
  const tracker = new CostTracker();
  const mockClient = new MockAIClient({
    defaultResponse: 'Test response',
  });

  // Simulate a chat request
  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);

  // Calculate cost using mock client's calculateCost method
  const costData = mockClient.calculateCost(response);

  // Track the request
  tracker.trackRequest('mock', mockClient.model, costData, {
    requestType: 'chat',
  });

  const stats = tracker.getStats();
  assert.strictEqual(stats.totalRequests, 1);
  assert.ok(stats.totalCost >= 0);
  assert.ok(costData.inputTokens > 0);
  assert.ok(costData.outputTokens > 0);
  assert.ok(costData.totalCost >= 0);
});

test('CostTracker - multiple requests tracking with calculateCost', async () => {
  const tracker = new CostTracker();
  const mockClient = new MockAIClient();

  // Simulate multiple requests and track costs
  for (let i = 0; i < 5; i++) {
    const response = await mockClient.chat([{ role: 'user', content: `Message ${i}` }]);
    const costData = mockClient.calculateCost(response);
    tracker.trackRequest('mock', mockClient.model, costData);
  }

  const stats = tracker.getStats();
  assert.strictEqual(stats.totalRequests, 5);
  assert.ok(stats.totalCost >= 0);
  assert.ok(stats.totalTokens > 0);
});

test('MockAIClient - calculateCost with OpenAI format', async () => {
  const mockClient = new MockAIClient({
    responseFormat: 'openai',
    model: 'mock-model',
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);
  const costData = mockClient.calculateCost(response);

  assert.ok(costData.inputTokens > 0);
  assert.ok(costData.outputTokens > 0);
  assert.ok(costData.totalTokens > 0);
  assert.ok(costData.inputCost >= 0);
  assert.ok(costData.outputCost >= 0);
  assert.ok(costData.totalCost >= 0);
  assert.strictEqual(costData.totalTokens, costData.inputTokens + costData.outputTokens);
});

test('MockAIClient - calculateCost with Claude format', async () => {
  const mockClient = new MockAIClient({
    responseFormat: 'claude',
    model: 'mock-model',
  });

  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);
  const costData = mockClient.calculateCost(response);

  assert.ok(costData.inputTokens > 0);
  assert.ok(costData.outputTokens > 0);
  assert.ok(costData.totalTokens > 0);
  assert.ok(costData.inputCost >= 0);
  assert.ok(costData.outputCost >= 0);
  assert.ok(costData.totalCost >= 0);
  assert.strictEqual(costData.totalTokens, costData.inputTokens + costData.outputTokens);
});

test('MockAIClient - calculateCost with response without usage', () => {
  const mockClient = new MockAIClient();
  const response = { id: 'test', choices: [] }; // Response without usage

  const costData = mockClient.calculateCost(response);

  assert.strictEqual(costData.inputTokens, 0);
  assert.strictEqual(costData.outputTokens, 0);
  assert.strictEqual(costData.totalTokens, 0);
  assert.strictEqual(costData.inputCost, 0);
  assert.strictEqual(costData.outputCost, 0);
  assert.strictEqual(costData.totalCost, 0);
});

test('CostTracker - trackRequest using response object (creates client from provider)', async () => {
  const tracker = new CostTracker();
  const mockClient = new MockAIClient({
    defaultResponse: 'Test response',
  });

  // Simulate a chat request
  const response = await mockClient.chat([{ role: 'user', content: 'Hello' }]);

  // Track using response object directly - trackRequest will create a mock client based on provider
  tracker.trackRequest('mock', mockClient.model, response, {
    requestType: 'chat',
  });

  const stats = tracker.getStats();
  assert.strictEqual(stats.totalRequests, 1);
  assert.ok(stats.totalCost >= 0);
});

test('CostTracker - trackRequest using token counts (creates client from provider)', async () => {
  const tracker = new CostTracker();
  const mockClient = new MockAIClient({
    model: 'mock-model',
  });

  // Track using token counts - trackRequest will create a mock client and use calculateCost
  const costData = {
    inputTokens: 10,
    outputTokens: 20,
  };

  tracker.trackRequest('mock', mockClient.model, costData);

  const stats = tracker.getStats();
  assert.strictEqual(stats.totalRequests, 1);
  assert.ok(stats.totalCost >= 0);
  const request = tracker.requests[0];
  assert.strictEqual(request.inputTokens, 10);
  assert.strictEqual(request.outputTokens, 20);
  assert.ok(request.totalCost > 0);
});
