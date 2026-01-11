import { test } from 'node:test';
import assert from 'node:assert';
import { RAGAgent } from '../../src/agents/rag-agent.js';
import { createMockClient, createStreamingMockClient } from '../helpers/test-helpers.js';

test('RAGAgent - add documents with mock client', async () => {
  const agent = new RAGAgent('test_collection');

  // Replace client with mock
  const mockClient = createMockClient();
  agent.openaiClient = mockClient;

  const documents = ['Document 1', 'Document 2', 'Document 3'];
  await agent.addDocuments(documents);

  // Verify embeddings were called
  const history = mockClient.getCallHistory();
  const embeddingCalls = history.filter((call) => call.method === 'getEmbeddings');
  assert.strictEqual(embeddingCalls.length, 1);
  assert.strictEqual(embeddingCalls[0].input.length, 3);
});

test('RAGAgent - query with mock client', async () => {
  const agent = new RAGAgent('test_collection');
  const mockClient = createMockClient({
    defaultResponse: 'This is the answer based on the context',
  });
  agent.openaiClient = mockClient;

  // Add documents first
  await agent.addDocuments(['Test document content']);

  // Query
  const response = await agent.query('What is the content?');

  assert.ok(typeof response === 'string');
  assert.strictEqual(response, 'This is the answer based on the context');

  // Verify chat was called
  const history = mockClient.getCallHistory();
  const chatCalls = history.filter((call) => call.method === 'chat');
  assert.strictEqual(chatCalls.length, 1);
});

test('RAGAgent - streaming query', async () => {
  const agent = new RAGAgent('test_collection');
  const mockClient = createStreamingMockClient('Streaming answer');
  agent.openaiClient = mockClient;

  await agent.addDocuments(['Test content']);

  const chunks = [];
  const fullText = await agent.queryStream('Question?', (chunk) => {
    chunks.push(chunk);
  });

  assert.strictEqual(fullText, 'Streaming answer');
  assert.ok(chunks.length > 0);
});
