# AI Client Interface

This directory contains AI client implementations that follow a unified interface, allowing you to use OpenAI (standard and Azure) and Claude interchangeably.

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

// Create a client
// 'openai' uses config.openai.defaultProvider to determine Azure vs Standard
const client = createAIClient('openai');  // Uses defaultProvider setting
const standardClient = createAIClient('openai-standard');  // Always Standard OpenAI
const azureClient = createAIClient('azure-openai');  // Always Azure OpenAI
const claudeClient = createAIClient('claude');  // Claude
```

### Default Provider Configuration

When you use `createAIClient('openai')`, the factory uses `config.openai.defaultProvider` to determine which client to create:

- **`'azure-openai'`** (default): Creates `AzureOpenAIClient`
- **`'openai-standard'`**: Creates `StandardOpenAIClient`

You can configure this via the `OPENAI_DEFAULT_PROVIDER` environment variable:

```bash
# Use Azure OpenAI when 'openai' is specified
OPENAI_DEFAULT_PROVIDER=azure-openai

# Use Standard OpenAI when 'openai' is specified
OPENAI_DEFAULT_PROVIDER=openai-standard
```

This allows you to switch between Azure and Standard OpenAI without changing your code - just update the environment variable.

### Direct Instantiation (Not Recommended)

**Note:** Always use the factory function `createAIClient()` instead of direct instantiation. The factory ensures consistent client creation and proper configuration.

```javascript
// ✅ Recommended: Use factory
const client = createAIClient('openai');
const azureClient = createAIClient('azure-openai');
const claudeClient = createAIClient('claude');

// ❌ Not recommended: Direct instantiation
// import { StandardOpenAIClient } from './clients/standard-openai-client.js';
// const client = new StandardOpenAIClient();
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

### Standard OpenAI Features (StandardOpenAIClient)

- **`createAssistant(instructions, tools)`** - Create persistent assistant (Assistants API)
- **`createThread()`** - Create conversation thread
- **`runAssistant(threadId, assistantId, userMessage)`** - Run assistant
- **`getEmbeddings(input, embeddingModel)`** - Get embeddings
- Requires: `OPENAI_API_KEY` environment variable

### Azure OpenAI Features (AzureOpenAIClient)

- **`getEmbeddings(input, embeddingModel)`** - Get embeddings
- Supports Azure-specific deployments and configurations
- Requires: `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` environment variables
- Note: Assistants API is not available with Azure OpenAI

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
import { createAIClient } from './clients/client-factory.js';
import { implementsAIClientInterface } from './clients/ai-client-interface.js';

const client = createAIClient('openai');
console.log(implementsAIClientInterface(client)); // true
```

## Mock Client for Testing

The `MockAIClient` is designed for testing without making actual API calls:

```javascript
import { MockAIClient } from './clients/mock-client.js';

// Basic usage
const mockClient = new MockAIClient({
  defaultResponse: 'Mock AI response',
  model: 'mock-model',
});

// Custom response handlers
const mockClient = new MockAIClient({
  chatHandler: async (messages, options) => {
    // Return custom response based on messages
    return {
      choices: [{
        message: { content: `Echo: ${messages[messages.length - 1].content}` }
      }]
    };
  },
  chatStreamHandler: async (messages, onChunk, options) => {
    // Simulate streaming
    const text = 'Streaming response';
    for (const char of text) {
      await new Promise(resolve => setTimeout(resolve, 10));
      if (onChunk) onChunk(char);
    }
    return text;
  },
  getEmbeddingsHandler: async (input) => {
    // Return custom embeddings
    return Array.isArray(input) 
      ? input.map(() => new Array(1536).fill(0.1))
      : [new Array(1536).fill(0.1)];
  }
});

// Simulate errors
const errorMockClient = new MockAIClient({
  simulateErrors: true
});

// Track call history
const trackedClient = new MockAIClient();
await trackedClient.chat([{ role: 'user', content: 'Hello' }]);
const history = trackedClient.getCallHistory();
console.log(history); // [{ method: 'chat', messages: [...], ... }]
```

### Mock Client Features

- **No API calls**: All methods return mock responses instantly
- **Configurable responses**: Set default responses or custom handlers
- **Call tracking**: Track all method calls for assertions
- **Error simulation**: Test error handling scenarios
- **Streaming support**: Simulate streaming responses
- **Tool calling**: Mock tool/function calling behavior
- **Embeddings**: Generate mock embedding vectors
- **Response formats**: Support both OpenAI and Claude response formats

## Choosing the Right Client

### Use StandardOpenAIClient when:
- You need Assistants API (not available on Azure)
- You want direct OpenAI API access
- You have `OPENAI_API_KEY` (not Azure credentials)
- You need the latest OpenAI features

### Use AzureOpenAIClient when:
- You're using Azure OpenAI service
- You have `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY`
- You need Azure-specific deployments
- You want enterprise-grade Azure integration

### Provider Selection with 'openai':

When you use `createAIClient('openai')`, the factory checks `config.openai.defaultProvider`:
- Set `OPENAI_DEFAULT_PROVIDER=azure-openai` to use Azure OpenAI
- Set `OPENAI_DEFAULT_PROVIDER=openai-standard` to use Standard OpenAI
- Default is `'azure-openai'` if not specified

For explicit control, use:
- `createAIClient('openai-standard')` - Always Standard OpenAI
- `createAIClient('azure-openai')` - Always Azure OpenAI

### Use MockAIClient when:
- Writing unit tests
- Testing without API keys
- Simulating different response scenarios
- Testing error handling
- Performance testing without API costs
