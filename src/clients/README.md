# AI Client Interface

This directory contains AI client implementations that follow a unified interface, allowing you to use OpenAI and Claude interchangeably.

## Unified Interface

All clients implement `AIClientInterface` which provides these common methods:

### Core Methods

- **`chat(messages, options)`** - Basic chat completion
- **`chatStream(messages, onChunk, options)`** - Streaming chat completion
- **`chatWithTools(messages, tools, options)`** - Chat with function/tool calling
- **`getTextContent(response)`** - Extract text from response
- **`hasToolUse(response)`** - Check if response contains tool calls
- **`getToolUseBlocks(response)`** - Get tool call blocks from response
- **`getEmbeddings(input, embeddingModel)`** - Get embeddings (OpenAI only)

## Usage

### Using the Factory Function

```javascript
import { createAIClient } from './clients/client-factory.js';

// Create a client (automatically detects available provider)
const client = createAIClient('openai');  // or 'claude'
```

### Direct Instantiation

```javascript
import { OpenAIClient } from './clients/openai-client.js';
import { ClaudeClient } from './clients/claude-client.js';

const openaiClient = new OpenAIClient();
const claudeClient = new ClaudeClient();
```

### Unified Interface Example

```javascript
import { createAIClient } from './clients/client-factory.js';

// Works with both OpenAI and Claude
const client = createAIClient('openai');

// Same API regardless of provider
const response = await client.chat([
  { role: 'user', content: 'Hello!' }
]);

const text = client.getTextContent(response);
```

## Method Compatibility

### chatWithTools vs chatWithFunctions

Both clients support both method names for backward compatibility:

- **`chatWithTools()`** - Unified interface method (recommended)
- **`chatWithFunctions()`** - Legacy method name (still supported)

### Tool Format Conversion

The interface automatically converts between OpenAI and Claude tool formats:

**OpenAI Format:**
```javascript
{
  name: 'function_name',
  description: 'Description',
  parameters: { type: 'object', properties: {...} }
}
```

**Claude Format:**
```javascript
{
  name: 'function_name',
  description: 'Description',
  input_schema: { type: 'object', properties: {...} }
}
```

Both formats are accepted by `chatWithTools()`.

## Provider-Specific Features

### OpenAI-Only Features

- **`createAssistant(instructions, tools)`** - Create persistent assistant
- **`createThread()`** - Create conversation thread
- **`runAssistant(threadId, assistantId, userMessage)`** - Run assistant
- **`getEmbeddings(input, embeddingModel)`** - Get embeddings

### Claude-Only Features

- None (all core features are in the unified interface)

## Response Format Differences

### OpenAI Response Format

```javascript
{
  choices: [{
    message: {
      content: 'text',
      tool_calls: [...]
    }
  }]
}
```

### Claude Response Format

```javascript
{
  content: [{
    type: 'text',
    text: 'text'
  }, {
    type: 'tool_use',
    ...
  }]
}
```

### Unified Access Methods

Use these methods to access responses consistently:

- **`getTextContent(response)`** - Gets text from either format
- **`hasToolUse(response)`** - Checks for tools in either format
- **`getToolUseBlocks(response)`** - Gets tools from either format

## Examples

See `src/examples/sdk-usage/unified-client-example.js` for complete examples.

## Interface Validation

Check if a client implements the interface:

```javascript
import { implementsAIClientInterface } from './clients/ai-client-interface.js';

const client = new OpenAIClient();
console.log(implementsAIClientInterface(client)); // true
```
