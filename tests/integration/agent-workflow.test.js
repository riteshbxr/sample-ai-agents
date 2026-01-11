import { test } from 'node:test';
import assert from 'node:assert';
import { FunctionCallingAgent } from '../../src/agents/function-calling-agent.js';
import { createMockClient } from '../helpers/test-helpers.js';

test('Agent workflow - multi-turn conversation with mock', async () => {
  const mockClient = createMockClient({
    defaultResponse: 'Mock response',
  });
  const agent = new FunctionCallingAgent('openai', mockClient);

  // First turn
  const response1 = await agent.chat('Hello');
  assert.ok(response1);

  // Second turn
  const response2 = await agent.chat('How are you?');
  assert.ok(response2);

  // Verify conversation history is maintained
  assert.strictEqual(agent.conversationHistory.length, 4); // 2 user + 2 assistant
});

test('Agent workflow - function calling chain', async () => {
  const mockClient = createMockClient();
  const agent = new FunctionCallingAgent('openai', mockClient);

  // Register functions
  let step1Called = false;
  let step2Called = false;

  agent.registerFunction('step1', 'First step', { type: 'object', properties: {} }, async () => {
    step1Called = true;
    return { result: 'step1 done' };
  });

  agent.registerFunction('step2', 'Second step', { type: 'object', properties: {} }, async () => {
    step2Called = true;
    return { result: 'step2 done' };
  });

  // Configure mock client for tool calling chain
  let callCount = 0;
  mockClient.chatWithToolsHandler = async (_messages, _tools) => {
    callCount++;
    if (callCount === 1) {
      // First call returns tool use for step1
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'step1',
                    arguments: '{}',
                  },
                },
              ],
            },
          },
        ],
      };
    } else if (callCount === 2) {
      // Second call returns tool use for step2
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_2',
                  type: 'function',
                  function: {
                    name: 'step2',
                    arguments: '{}',
                  },
                },
              ],
            },
          },
        ],
      };
    } else {
      // Third call (after step2 execution) returns final response
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Workflow completed',
            },
          },
        ],
      };
    }
  };

  const response = await agent.chat('Run the workflow');

  assert.strictEqual(step1Called, true);
  assert.strictEqual(step2Called, true);
  assert.ok(response.includes('Workflow completed'));
});
