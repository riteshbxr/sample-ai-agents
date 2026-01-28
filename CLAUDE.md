# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern JavaScript project demonstrating AI agent patterns and strategies using OpenAI (including Azure OpenAI) and Claude APIs. The project uses ES modules and provides both direct SDK usage examples and higher-level architectural patterns.

## Core Commands

### Development
```bash
npm start              # Run interactive menu to select examples
npm run menu           # Same as npm start
```

### Testing
```bash
npm test                      # Run all tests using Node.js built-in test runner
npm run test:watch            # Run tests in watch mode
npm run test:clients          # Run client tests only
npm run test:agents           # Run agent tests only
npm run test:integration      # Run integration tests only
```

### Code Quality
```bash
npm run lint           # Check code for issues
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check if code is formatted correctly
npm run validate       # Run both linting and format checking
```

### Running Examples
Examples can be run individually via npm scripts. Examples are organized into:
- **SDK Usage**: Direct API usage (`npm run demo:chat`, `npm run demo:streaming`, etc.)
- **Strategies**: Higher-level patterns (`npm run demo:agent`, `npm run demo:rag`, etc.)

See package.json scripts for all available `demo:*` commands.

## Architecture

### Unified Client Interface Pattern

**The most important architectural concept in this codebase** is the unified client interface that abstracts OpenAI (Standard + Azure) and Claude behind a consistent API.

#### Client Factory (`src/clients/client-factory.js`)
All AI client instantiation goes through `createAIClient(provider)`:
```javascript
import { createAIClient } from './src/clients/client-factory.js';

// Smart routing based on config.openai.defaultProvider
const client = createAIClient('openai');

// Explicit providers
const azureClient = createAIClient('azure-openai');
const standardClient = createAIClient('openai-standard');
const claudeClient = createAIClient('claude');
const mockClient = createAIClient('mock'); // For testing
```

#### Provider Routing
When `createAIClient('openai')` is called:
- Checks `config.openai.defaultProvider` (from `OPENAI_DEFAULT_PROVIDER` env var)
- Routes to either `AzureOpenAIClient` or `StandardOpenAIClient`
- Allows switching between Azure/Standard OpenAI without code changes

#### Unified Interface (`src/clients/ai-client-interface.js`)
All clients implement these common methods:
- `chat(messages, options)` - Basic chat completion
- `chatStream(messages, onChunk, options)` - Streaming chat
- `chatWithTools(messages, tools, options)` - Tool/function calling
- `getTextContent(response)` - Extract text from response
- `hasToolUse(response)` - Check for tool calls
- `getToolUseBlocks(response)` - Get tool call blocks

#### Client Implementations
- **`StandardOpenAIClient`**: Standard OpenAI API (includes Assistants API support)
- **`AzureOpenAIClient`**: Azure OpenAI Service (no Assistants API)
- **`ClaudeClient`**: Anthropic Claude API
- **`MockAIClient`**: Mock for testing (implements full interface)

### Provider Configuration (`src/config.js`)

Central configuration with smart defaults:
- `config.openai.defaultProvider` - Routes 'openai' to Azure or Standard
- `providerUtils.getDefaultProvider()` - Smart routing for general tasks
- `providerUtils.getDefaultVisionProvider()` - Routing for vision tasks
- `providerUtils.getDefaultAssistantsProvider()` - Routing for Assistants API
- `providerUtils.isProviderAvailable(provider)` - Check provider availability

### Services Layer (`src/services/`)

High-level service abstractions built on top of clients:
- **`ChatService`**: Simple chat, streaming, structured outputs
- **`VisionService`**: Image analysis, OCR, visual Q&A
- **`EmbeddingsService`**: Similarity search, clustering, classification
- **`ModelComparisonService`**: Compare outputs across models
- **`PromptService`**: Prompt engineering techniques
- **`AssistantsService`**: Persistent assistants with threads
- **`ContextExtractionService`**: Extract relevant context from chat history
- **`CheckpointStore`**, **`StatefulAgent`**, **`TaskStateManager`**: State persistence and checkpointing

Services handle provider abstraction, response formatting, and common patterns.

### Agents (`src/agents/`)

Reusable agent implementations:
- **`FunctionCallingAgent`**: Agent with tool/function calling capabilities
- **`RAGAgent`**: Retrieval-Augmented Generation with vector search

### Examples Organization

Examples are split into two categories:

1. **SDK Usage** (`src/examples/sdk-usage/`): Direct API demonstrations
   - Basic chat, streaming, multi-model comparison
   - Structured outputs, vision, embeddings
   - Assistants API, interactive chat

2. **Strategies** (`src/examples/strategies/`): Higher-level architectural patterns
   - Function calling agents, RAG
   - Multi-agent collaboration, error handling
   - Cost tracking, batch processing, memory management
   - Prompt engineering, workflows, security, caching

## Key Implementation Patterns

### 1. Always Use Client Factory
```javascript
// ✅ CORRECT
const client = createAIClient('openai');

// ❌ WRONG - Do not instantiate directly
// const client = new StandardOpenAIClient();
```

### 2. Provider-Agnostic Code
Write code that works with any provider using the unified interface:
```javascript
const client = createAIClient('openai'); // or 'claude'
const response = await client.chat(messages);
const text = client.getTextContent(response);
```

### 3. Tool/Function Calling Format
The interface accepts both OpenAI and Claude tool formats:
```javascript
// OpenAI format (with 'parameters')
{ name: 'tool', description: '...', parameters: {...} }

// Claude format (with 'input_schema')
{ name: 'tool', description: '...', input_schema: {...} }

// Both work with chatWithTools()
```

### 4. Response Format Abstraction
Never access response format directly. Use helper methods:
```javascript
// ✅ CORRECT
const text = client.getTextContent(response);
const hasTools = client.hasToolUse(response);

// ❌ WRONG
// const text = response.choices[0].message.content; // OpenAI-specific
// const text = response.content[0].text; // Claude-specific
```

### 5. Provider-Specific Features

**Assistants API** (OpenAI Standard only):
```javascript
const client = createAIClient('openai-standard'); // Must use standard, not Azure
const assistant = await client.createAssistant(instructions, tools);
```

**Embeddings** (OpenAI only):
```javascript
const client = createAIClient('openai'); // Works with Azure or Standard
const embeddings = await client.getEmbeddings(texts);
```

### 6. Error Handling
All API calls should handle errors with appropriate retry logic:
```javascript
try {
  const response = await client.chat(messages);
} catch (error) {
  if (error.status === 429) {
    // Rate limit - retry with backoff
  } else if (error.status === 401) {
    // Auth error - check API keys
  } else {
    // Handle other errors
  }
}
```

See `src/examples/strategies/error-handling/` for production-ready patterns.

## Environment Configuration

Required environment variables (set in `.env`):

**For Azure OpenAI** (Recommended):
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT=gpt-4-turbo-preview
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

**For Standard OpenAI**:
```bash
OPENAI_API_KEY=your_api_key
```

**For Claude**:
```bash
ANTHROPIC_API_KEY=your_api_key
```

**Provider Selection**:
```bash
OPENAI_DEFAULT_PROVIDER=azure-openai    # or 'openai-standard'
```

## Testing

### Test Structure
- `tests/clients/` - Client implementation tests
- `tests/agents/` - Agent tests
- `tests/services/` - Service layer tests
- `tests/integration/` - Integration tests
- `tests/strategies/` - Strategy pattern tests
- `tests/helpers/` - Test helper utilities
- `tests/utils/` - Utility function tests

### Mock Client
Use `MockAIClient` for tests without API calls:
```javascript
import { MockAIClient } from './src/clients/mock-client.js';

const mockClient = new MockAIClient({
  defaultResponse: 'Mock response',
  simulateErrors: false
});
```

### Test Execution
Tests use Node.js built-in test runner (no Jest/Mocha):
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Feature', () => {
  it('should work', () => {
    assert.strictEqual(1, 1);
  });
});
```

## Code Quality Standards

### Pre-commit Hooks
Husky hooks automatically run before commits:
- ESLint auto-fixes issues
- Prettier auto-formats code
- Commitlint validates commit messages

### Commit Message Format
Follow Conventional Commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

Examples:
- `feat(agents): add streaming support for Claude client`
- `fix(clients): resolve authentication error with Azure OpenAI`
- `docs: update README with new examples`

### Code Style
- Use ES modules (`import`/`export`)
- Use JSDoc for type annotations
- Follow existing naming conventions
- Keep functions focused and small
- Use async/await (avoid callbacks)

## Common Development Tasks

### Adding a New Example
1. Place in appropriate directory (`sdk-usage/` or `strategies/`)
2. Use `createAIClient()` for client instantiation
3. Add npm script in package.json
4. Update menu.js if adding to interactive menu
5. Follow existing example structure

### Adding a New Client
1. Implement `AIClientInterface` methods
2. Add to `client-factory.js`
3. Add configuration in `config.js`
4. Add tests in `tests/clients/`
5. Update `src/clients/README.md`

### Adding a New Service
1. Create in `src/services/`
2. Use client factory for AI client access
3. Add comprehensive JSDoc with examples
4. Add tests in `tests/services/`
5. Update `src/services/README.md`

### Modifying Client Interface
**IMPORTANT**: Changing the unified interface affects all clients and examples:
1. Update `ai-client-interface.js`
2. Implement in all clients (Standard, Azure, Claude, Mock)
3. Update all examples that use the interface
4. Update tests for all clients
5. Update documentation in `src/clients/README.md`

## Important Files

- **`src/config.js`** - Central configuration and provider routing logic
- **`src/clients/client-factory.js`** - Client instantiation (use this!)
- **`src/clients/ai-client-interface.js`** - Unified interface definition
- **`src/clients/README.md`** - Detailed client interface documentation
- **`src/services/README.md`** - Service layer documentation
- **`src/menu.js`** - Interactive example selector
- **`package.json`** - All npm scripts and dependencies

## Dependencies

### Core AI SDKs
- `openai` - OpenAI API (Standard + Azure)
- `@anthropic-ai/sdk` - Claude API

### Vector/Embeddings
- `chromadb` - ChromaDB vector database
- `@chroma-core/default-embed` - Default embeddings

### LangChain (Optional)
- `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`
- `langfuse` - LLM observability

### Dev Tools
- `eslint`, `prettier` - Code quality
- `husky`, `lint-staged`, `@commitlint/*` - Git hooks
- `nodemon` - Development server
- `dotenv` - Environment variables

## Project Structure Overview

```
src/
├── clients/           # AI client implementations
│   ├── client-factory.js       # Factory for creating clients
│   ├── ai-client-interface.js  # Unified interface definition
│   ├── standard-openai-client.js
│   ├── azure-openai-client.js
│   ├── claude-client.js
│   └── mock-client.js          # Testing mock
├── services/          # High-level service abstractions
├── agents/            # Reusable agent implementations
├── utils/             # Utility functions
│   ├── simple-vector-store.js  # In-memory vector store
│   ├── token-utils.js          # Token counting
│   ├── cost-utils.js           # Cost calculation
│   └── logger.js               # Structured logging
├── examples/
│   ├── sdk-usage/     # Direct API usage examples
│   └── strategies/    # Advanced patterns and strategies
├── config.js          # Configuration and provider utilities
└── menu.js            # Interactive example selector

tests/
├── clients/           # Client tests
├── agents/            # Agent tests
├── services/          # Service tests
├── integration/       # Integration tests
├── strategies/        # Strategy pattern tests
├── helpers/           # Test helpers
└── utils/             # Utility tests
```

## When Making Changes

### Adding New AI Features
1. Check if it fits in existing client interface
2. If provider-specific, add to specific client only
3. If universal, add to unified interface and all clients
4. Consider service layer abstraction for common patterns

### Refactoring
1. Maintain unified interface compatibility
2. Update all client implementations together
3. Run full test suite (`npm test`)
4. Update examples if interface changes
5. Update documentation

### Performance Considerations
- Use streaming for long responses
- Cache embeddings when possible
- Implement rate limiting for batch operations
- Monitor token usage for cost optimization

## Additional Resources

- **README.md** - Project overview, features, usage examples
- **TUTORIAL.md** - Comprehensive tutorial for all features
- **CONTRIBUTING.md** - Contribution guidelines, workflow, commit conventions
