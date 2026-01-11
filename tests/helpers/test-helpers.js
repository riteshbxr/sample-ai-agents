/**
 * Test Helpers
 * Utilities for testing with MockAIClient
 */

import { MockAIClient } from '../../src/clients/mock-client.js';

/**
 * Create a mock client with default test configuration
 * @param {Object} [overrides={}] - Configuration overrides
 * @returns {MockAIClient} Configured mock client
 */
export function createMockClient(overrides = {}) {
  return new MockAIClient({
    defaultResponse: 'Test response',
    model: 'test-model',
    ...overrides,
  });
}

/**
 * Create a mock client that returns tool calls
 * @param {string} toolName - Name of the tool to call
 * @param {Object} toolInput - Input for the tool
 * @returns {MockAIClient} Mock client configured for tool calling
 */
export function createToolCallingMockClient(toolName, toolInput = {}) {
  return new MockAIClient({
    chatWithToolsHandler: async () => {
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
                    name: toolName,
                    arguments: JSON.stringify(toolInput),
                  },
                },
              ],
            },
          },
        ],
      };
    },
  });
}

/**
 * Create a mock client that simulates streaming
 * @param {string} responseText - Text to stream
 * @returns {MockAIClient} Mock client configured for streaming
 */
export function createStreamingMockClient(responseText = 'Streaming response') {
  return new MockAIClient({
    defaultResponse: responseText,
    chatStreamHandler: async (messages, onChunk) => {
      const words = responseText.split(' ');
      for (const word of words) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (onChunk) {
          onChunk(word + ' ');
        }
      }
      return responseText;
    },
  });
}

/**
 * Assert that a client implements the AIClientInterface
 * @param {Object} client - Client to check
 * @param {string} [message] - Custom assertion message
 */
export function assertImplementsInterface(
  client,
  message = 'Client should implement AIClientInterface'
) {
  const requiredMethods = [
    'chat',
    'chatStream',
    'chatWithTools',
    'getTextContent',
    'hasToolUse',
    'getToolUseBlocks',
  ];

  for (const method of requiredMethods) {
    if (typeof client[method] !== 'function') {
      throw new Error(`${message}: Missing method ${method}`);
    }
  }
}
