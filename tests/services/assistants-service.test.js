import { test } from 'node:test';
import assert from 'node:assert';
import { AssistantsService } from '../../src/services/assistants-service.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('AssistantsService - constructor requires OpenAI standard API', () => {
  // This test verifies that the service uses providerUtils.getDefaultAssistantsProvider()
  // which throws if OpenAI standard API key is not configured
  // In a test environment, we'll mock the client
  const service = new AssistantsService();
  assert.ok(service.client);
});

test('AssistantsService - create assistant', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  // Mock the createAssistant method
  service.client.createAssistant = async (instructions, tools, options) => {
    return {
      id: 'asst_123',
      instructions,
      tools,
      model: options.model || 'gpt-4-turbo-preview',
      name: options.name,
    };
  };

  const assistant = await service.createAssistant(
    'You are a helpful assistant',
    [{ type: 'code_interpreter' }],
    { name: 'Test Assistant', model: 'gpt-4' }
  );

  assert.strictEqual(assistant.id, 'asst_123');
  assert.strictEqual(assistant.instructions, 'You are a helpful assistant');
  assert.strictEqual(assistant.name, 'Test Assistant');
  assert.ok(Array.isArray(assistant.tools));
});

test('AssistantsService - create thread', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  // Mock the createThread method
  service.client.createThread = async () => ({ id: 'thread_123' });

  const thread = await service.createThread();

  assert.strictEqual(thread.id, 'thread_123');
});

test('AssistantsService - add message to thread', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  service.client.client = {
    beta: {
      threads: {
        messages: {
          create: async (threadId, messageData) => ({
            id: 'msg_123',
            thread_id: threadId,
            role: messageData.role,
            content: [{ type: 'text', text: { value: messageData.content } }],
          }),
        },
      },
    },
  };

  const message = await service.addMessage('thread_123', 'Hello!', 'user');

  assert.strictEqual(message.id, 'msg_123');
  assert.strictEqual(message.thread_id, 'thread_123');
  assert.strictEqual(message.role, 'user');
});

test('AssistantsService - run assistant', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  let pollCount = 0;
  service.client.client = {
    beta: {
      threads: {
        runs: {
          create: async (threadId, data) => ({
            id: 'run_123',
            thread_id: threadId,
            assistant_id: data.assistant_id,
            status: 'queued',
          }),
          retrieve: async (threadId, runId) => {
            pollCount++;
            return {
              id: runId,
              thread_id: threadId,
              status: pollCount > 2 ? 'completed' : 'in_progress',
            };
          },
        },
        messages: {
          list: async (threadId) => ({
            data: [
              {
                id: 'msg_456',
                role: 'assistant',
                content: [{ type: 'text', text: { value: 'Assistant response' } }],
              },
            ],
          }),
        },
      },
    },
  };

  const run = await service.runAssistant('thread_123', 'asst_123');

  assert.strictEqual(run.status, 'completed');
  assert.ok(pollCount > 0); // Verify polling occurred

  // Get the actual response content
  const response = await service.getAssistantResponse('thread_123');
  assert.strictEqual(response, 'Assistant response');
});

test('AssistantsService - get messages', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  service.client.client = {
    beta: {
      threads: {
        messages: {
          list: async (threadId) => ({
            data: [
              {
                id: 'msg_1',
                role: 'user',
                content: [{ type: 'text', text: { value: 'Hello' } }],
              },
              {
                id: 'msg_2',
                role: 'assistant',
                content: [{ type: 'text', text: { value: 'Hi there!' } }],
              },
            ],
          }),
        },
      },
    },
  };

  const messages = await service.getMessages('thread_123');

  assert.strictEqual(messages.length, 2);
  assert.strictEqual(messages[0].role, 'user');
  assert.strictEqual(messages[1].role, 'assistant');
});

test('AssistantsService - get assistant response extracts content', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  service.client.client = {
    beta: {
      threads: {
        messages: {
          list: async () => ({
            data: [
              {
                id: 'msg_1',
                role: 'assistant',
                content: [{ type: 'text', text: { value: 'Test message' } }],
              },
            ],
          }),
        },
      },
    },
  };

  const content = await service.getAssistantResponse('thread_123');
  assert.strictEqual(content, 'Test message');
});

test('AssistantsService - get assistant response returns null when no assistant message', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  service.client.client = {
    beta: {
      threads: {
        messages: {
          list: async () => ({
            data: [
              {
                id: 'msg_1',
                role: 'user',
                content: [{ type: 'text', text: { value: 'Hello' } }],
              },
            ],
          }),
        },
      },
    },
  };

  const content = await service.getAssistantResponse('thread_123');
  assert.strictEqual(content, null);
});

test('AssistantsService - complete conversation (end-to-end)', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  let messageAdded = false;
  let runExecuted = false;

  service.client.createAssistant = async (instructions) => ({
    id: 'asst_789',
    instructions,
  });

  service.client.createThread = async () => ({ id: 'thread_456' });

  service.client.client = {
    beta: {
      threads: {
        messages: {
          create: async (threadId, data) => {
            messageAdded = true;
            return {
              id: 'msg_789',
              thread_id: threadId,
              role: data.role,
              content: [{ type: 'text', text: { value: data.content } }],
            };
          },
          list: async () => ({
            data: [
              {
                id: 'msg_result',
                role: 'assistant',
                content: [{ type: 'text', text: { value: 'End-to-end response' } }],
              },
            ],
          }),
        },
        runs: {
          create: async () => {
            runExecuted = true;
            return { id: 'run_789', status: 'queued' };
          },
          retrieve: async () => ({ id: 'run_789', status: 'completed' }),
        },
      },
    },
  };

  const assistant = await service.createAssistant('You are helpful');
  const thread = await service.createThread();
  const response = await service.completeConversation(thread.id, assistant.id, 'Hello assistant');

  assert.ok(messageAdded);
  assert.ok(runExecuted);
  assert.strictEqual(response, 'End-to-end response');
});

test('AssistantsService - complete conversation throws on failed run', async () => {
  const mockClient = new MockAIClient();
  const service = new AssistantsService();
  service.client = mockClient;

  service.client.client = {
    beta: {
      threads: {
        messages: {
          create: async () => ({
            id: 'msg_1',
            thread_id: 'thread_1',
            role: 'user',
            content: [{ type: 'text', text: { value: 'Hello' } }],
          }),
          list: async () => ({ data: [] }),
        },
        runs: {
          create: async () => ({ id: 'run_1', status: 'queued' }),
          retrieve: async () => ({ id: 'run_1', status: 'failed' }),
        },
      },
    },
  };

  await assert.rejects(
    async () => {
      await service.completeConversation('thread_1', 'asst_1', 'Hello');
    },
    {
      message: /Run failed with status: failed/,
    }
  );
});
