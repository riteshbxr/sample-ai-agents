/**
 * Clients Barrel Export
 *
 * Central export point for all AI client implementations
 */

export { AIClientInterface, implementsAIClientInterface } from './ai-client-interface.js';
export { createAIClient } from './client-factory.js';
export { OpenAIClient } from './openai-client.js';
export { ClaudeClient } from './claude-client.js';
