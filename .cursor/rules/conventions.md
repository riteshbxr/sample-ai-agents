---
description: Coding standards - naming, imports, error handling, testing patterns
alwaysApply: true
---

# Coding Conventions

This document defines the coding standards and conventions for this project.

## Language & Runtime

- **Runtime**: Node.js 20+ LTS
- **Module System**: ES Modules only (`import`/`export`)
- **Style**: Modern JavaScript (ES2022+)

## Naming Conventions

### Files
| Type | Convention | Example |
|------|------------|---------|
| Classes/Clients | kebab-case | `azure-openai-client.js` |
| Examples | kebab-case with suffix | `streaming-example.js` |
| Utilities | kebab-case | `token-utils.js` |
| Tests | kebab-case with `.test` | `client-factory.test.js` |

### Code
| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `FunctionCallingAgent` |
| Functions | camelCase | `createAIClient` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Variables | camelCase | `responseText` |
| Private methods | _prefixed | `_validateInput` |

## Import Order

```javascript
// 1. Node.js built-ins
import { readFile } from 'node:fs/promises';

// 2. External packages
import OpenAI from 'openai';

// 3. Internal modules (absolute paths)
import { config } from './src/config.js';

// 4. Relative imports
import { helper } from './utils.js';
```

## Function Style

### Prefer Arrow Functions for Callbacks
```javascript
// ✅ Good
array.map((item) => item.value);

// ❌ Avoid
array.map(function(item) { return item.value; });
```

### Use Named Exports
```javascript
// ✅ Good
export function createClient() {}
export class AIClient {}

// ❌ Avoid default exports for utilities
export default function() {}
```

### Async/Await Over Promises
```javascript
// ✅ Good
async function fetchData() {
  const response = await client.chat(messages);
  return response;
}

// ❌ Avoid
function fetchData() {
  return client.chat(messages).then(response => response);
}
```

## Error Handling

### Always Use Try-Catch for Async Operations
```javascript
async function safeChat(messages) {
  try {
    const response = await client.chat(messages);
    return { success: true, data: response };
  } catch (error) {
    console.error('Chat failed:', error.message);
    return { success: false, error: error.message };
  }
}
```

### Error Classification
```javascript
if (error.status === 429) {
  // Rate limit - retry with backoff
} else if (error.status === 401) {
  // Auth error - don't retry
} else if (error.status >= 500) {
  // Server error - retry
}
```

## Documentation

### JSDoc for Public Functions
```javascript
/**
 * Creates an AI client for the specified provider.
 * @param {string} provider - Provider name ('openai', 'claude', 'azure-openai')
 * @param {Object} [options] - Optional configuration
 * @returns {AIClientInterface} Configured AI client
 * @throws {Error} If provider is not supported
 */
export function createAIClient(provider, options = {}) {
  // ...
}
```

### Inline Comments for Complex Logic
```javascript
// Calculate exponential backoff: delay = baseDelay * 2^attempt
const delay = baseDelayMs * Math.pow(2, attempt);
```

## Testing Conventions

### Test File Structure
```javascript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      assert.strictEqual(result, expected);
    });
  });
});
```

### Test Naming
- Use descriptive `it` statements: `it('should return error when API key is missing')`
- Group related tests with `describe`

## Client Interface Conventions

### Always Use Factory
```javascript
// ✅ Correct
import { createAIClient } from './src/clients/client-factory.js';
const client = createAIClient('openai');

// ❌ Wrong
import { StandardOpenAIClient } from './src/clients/standard-openai-client.js';
const client = new StandardOpenAIClient();
```

### Response Handling
```javascript
// ✅ Correct - provider agnostic
const text = client.getTextContent(response);

// ❌ Wrong - provider specific
const text = response.choices[0].message.content;
```

## Git Commit Messages

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code restructuring |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

### Examples
```
feat(clients): add streaming support for Claude client

fix(rag): resolve memory leak in vector store

docs: update README with new examples

refactor(agents): extract common logic to base class
```

## Code Organization

### Example Files Structure
```javascript
/**
 * Example: Feature Name
 * Demonstrates: What this example shows
 */

import { createAIClient } from '../clients/client-factory.js';

// Constants at top
const EXAMPLE_CONFIG = { ... };

// Main function
async function main() {
  console.log('=== Example Name ===\n');
  
  // Example logic
  
  console.log('\n=== Example Complete ===');
}

// Run
main().catch(console.error);
```

## Do's and Don'ts

### Do
- ✅ Use the client factory for all AI client creation
- ✅ Handle errors appropriately
- ✅ Write tests for new functionality
- ✅ Use JSDoc for public APIs
- ✅ Follow existing patterns in the codebase
- ✅ Run `npm test` before committing

### Don't
- ❌ Commit API keys or .env files
- ❌ Use callbacks (use async/await)
- ❌ Access provider-specific response formats
- ❌ Skip error handling
- ❌ Create new files when editing existing ones works
- ❌ Break the unified client interface
