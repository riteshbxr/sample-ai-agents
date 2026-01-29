---
description: Core project rules for AI Agents Demo - client usage, code style, testing
alwaysApply: true
---

# Cursor Rules for AI Agents Demo Project

## Code Style
- Use ES modules (import/export), never CommonJS
- Use async/await, never callbacks
- Use JSDoc for type annotations
- Follow existing naming conventions in codebase

## Client Usage (CRITICAL)
- ALWAYS use `createAIClient()` from `src/clients/client-factory.js`
- NEVER instantiate clients directly (no `new StandardOpenAIClient()`)
- Use helper methods: `getTextContent()`, `hasToolUse()`, `getToolUseBlocks()`
- NEVER access provider-specific response formats directly

## File Operations
- Prefer editing existing files over creating new ones
- Place examples in `src/examples/sdk-usage/` or `src/examples/strategies/`
- Add npm scripts for new examples in `package.json`

## Testing
- Use Node.js built-in test runner (node:test)
- Use `MockAIClient` for tests without API calls
- Run `npm test` before committing

## Git
- Use Conventional Commits: feat:, fix:, docs:, refactor:, test:
- Pre-commit hooks run ESLint and Prettier automatically
- Never commit .env files or API keys

## When Adding Features
- Update all client implementations together (Standard, Azure, Claude, Mock)
- Maintain unified interface compatibility
- Add tests for new functionality

## Quick Reference
```javascript
// Correct client usage
import { createAIClient } from './src/clients/client-factory.js';
const client = createAIClient('openai');
const response = await client.chat(messages);
const text = client.getTextContent(response);
```
