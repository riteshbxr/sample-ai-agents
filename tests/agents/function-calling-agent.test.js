import { test } from 'node:test';
import assert from 'node:assert';
import { FunctionCallingAgent } from '../../src/agents/function-calling-agent.js';
import { createMockClient, createToolCallingMockClient } from '../helpers/test-helpers.js';

test('FunctionCallingAgent - basic chat with mock client', async () => {
  // Create mock client and pass to constructor to avoid requiring API keys
  const mockClient = createMockClient({
    defaultResponse: 'This is a test response from the agent',
  });
  const agent = new FunctionCallingAgent('openai', mockClient);

  const response = await agent.chat('What is the weather?');

  assert.ok(typeof response === 'string');
  assert.strictEqual(response, 'This is a test response from the agent');
});

test('FunctionCallingAgent - function calling with mock', async () => {
  // Create mock client and pass to constructor to avoid requiring API keys
  const mockClient = createToolCallingMockClient('test_function', { param: 'test-value' });
  const agent = new FunctionCallingAgent('openai', mockClient);

  // Register a test function
  let functionCalled = false;
  agent.registerFunction(
    'test_function',
    'A test function',
    {
      type: 'object',
      properties: {
        param: { type: 'string' },
      },
    },
    async ({ param }) => {
      functionCalled = true;
      return { result: `Called with: ${param}` };
    }
  );

  // Configure chatWithToolsHandler to return tool call first, then final response
  let callCount = 0;
  mockClient.chatWithToolsHandler = async (_messages, _tools) => {
    callCount++;
    if (callCount === 1) {
      // First call returns tool use
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: `call_${Date.now()}`,
                  type: 'function',
                  function: {
                    name: 'test_function',
                    arguments: JSON.stringify({ param: 'test-value' }),
                  },
                },
              ],
            },
          },
        ],
      };
    } else {
      // Second call (after tool execution) returns final response
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Function executed successfully with test-value',
            },
          },
        ],
      };
    }
  };

  const response = await agent.chat('Call test_function');

  // Verify function was called
  assert.strictEqual(functionCalled, true);
  assert.ok(response.includes('Function executed successfully'));
});

test('FunctionCallingAgent - conversation history', async () => {
  const mockClient = createMockClient({
    defaultResponse: 'Response',
  });
  const agent = new FunctionCallingAgent('openai', mockClient);

  await agent.chat('First message');
  await agent.chat('Second message');

  assert.strictEqual(agent.conversationHistory.length, 4); // 2 user + 2 assistant messages
});
