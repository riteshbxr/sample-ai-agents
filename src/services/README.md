# Services Guide

This directory contains reusable service classes that provide high-level abstractions for common AI operations. These services wrap the underlying AI clients and provide convenient, production-ready interfaces.

## 📋 Table of Contents

- [Overview](#overview)
- [Available Services](#available-services)
- [Quick Start](#quick-start)
- [Service Details](#service-details)
  - [ChatService](#chatservice)
  - [VisionService](#visionservice)
  - [EmbeddingsService](#embeddingsservice)
  - [ModelComparisonService](#modelcomparisonservice)
  - [PromptService](#promptservice)
  - [AssistantsService](#assistantsservice)
  - [ContextExtractionService](#contextextractionservice)
  - [State Persistence Service](#state-persistence-service)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

Services provide a clean, consistent API for interacting with AI models. They handle:
- Provider abstraction (OpenAI, Claude, Azure OpenAI)
- Response formatting
- Error handling
- Common use cases

All services follow a similar pattern:
```javascript
import { ChatService } from './services/chat-service.js';

const service = new ChatService('openai'); // or 'claude', or null for default
const result = await service.someMethod(...);
```

---

## Available Services

| Service | Purpose | Key Features |
|---------|---------|--------------|
| **ChatService** | Simple chat interactions | Basic chat, streaming, structured outputs |
| **VisionService** | Image analysis | Image analysis, OCR, visual Q&A |
| **EmbeddingsService** | Text embeddings | Similarity search, clustering, classification |
| **ModelComparisonService** | Compare AI models | Side-by-side comparison, difference analysis |
| **PromptService** | Prompt engineering | Few-shot, CoT, role-playing, prompt chaining |
| **AssistantsService** | Persistent assistants | Thread management, assistant creation |
| **ContextExtractionService** | Context extraction | Extract relevant context from chat history |
| **State Persistence** | State management | Checkpointing, stateful workflows |

---

## Quick Start

### Installation

Services are part of the main package. Import them directly:

```javascript
import { ChatService, VisionService, EmbeddingsService } from './services/index.js';
```

### Basic Usage

```javascript
// Chat Service
const chatService = new ChatService();
const response = await chatService.chat([
  { role: 'user', content: 'Hello!' }
]);
console.log(response.content);

// Vision Service
const visionService = new VisionService();
const analysis = await visionService.analyzeImage('./image.png', 'What is this?');
console.log(analysis);

// Embeddings Service
const embeddingsService = new EmbeddingsService();
const embeddings = await embeddingsService.getEmbeddings('Hello world');
console.log(embeddings[0].length); // e.g., 1536
```

---

## Service Details

### ChatService

Provides simple chat functionality with support for streaming and structured outputs.

#### Features
- ✅ Basic chat completion
- ✅ Streaming responses
- ✅ Structured JSON output
- ✅ Data extraction from text

#### Example

```javascript
import { ChatService } from './services/chat-service.js';

const service = new ChatService('openai');

// Basic chat
const response = await service.chat([
  { role: 'user', content: 'What is AI?' }
], { temperature: 0.7 });
console.log(response.content);

// Streaming
await service.chatStream(
  [{ role: 'user', content: 'Tell me a story' }],
  (chunk) => process.stdout.write(chunk)
);

// Structured output
const data = await service.getStructuredOutput([
  { role: 'user', content: 'Extract name and age: John is 30' }
]);
console.log(data); // { name: "John", age: 30 }

// Extract structured data
const extracted = await service.extractStructuredData(
  'Contact: Alice, email: alice@example.com',
  ['name', 'email']
);
console.log(extracted); // { name: "Alice", email: "alice@example.com" }
```

#### API

- `chat(messages, options)` - Send chat messages
- `chatStream(messages, onChunk, options)` - Stream chat response
- `getStructuredOutput(messages, options)` - Get JSON output
- `extractStructuredData(text, schema, options)` - Extract data from text

---

### VisionService

Provides image analysis capabilities including OCR and visual question answering.

#### Features
- ✅ Image analysis with custom prompts
- ✅ OCR (text extraction)
- ✅ Visual question answering
- ✅ Multiple image input formats (file path, base64, Buffer)

#### Example

```javascript
import { VisionService } from './services/vision-service.js';

const service = new VisionService('openai-standard');

// Analyze image
const analysis = await service.analyzeImage(
  './photo.jpg',
  'What is in this image?',
  { temperature: 0.7, max_tokens: 500 }
);
console.log(analysis);

// Extract text (OCR)
const text = await service.extractText('./document.png');
console.log('Extracted text:', text);

// Answer questions
// Single question
const answer = await service.answerQuestions(
  './photo.jpg',
  'What colors are in this image?'
);

// Multiple questions
const answers = await service.answerQuestions('./photo.jpg', [
  'What is in this image?',
  'What colors are present?',
  'Describe the scene'
]);
console.log(answers['What is in this image?']);
```

#### Supported Image Formats
- File path: `'./image.png'`
- Base64 string: `'iVBORw0KGgo...'`
- Data URL: `'data:image/png;base64,...'`
- Buffer: `Buffer.from(...)`

#### API

- `analyzeImage(image, prompt, options)` - Analyze image with custom prompt
- `extractText(image, options)` - Extract text from image (OCR)
- `answerQuestions(image, questions, options)` - Answer questions about image
- `encodeImageToBase64(imagePath)` - Encode image file to base64
- `createTestImageBase64()` - Create test image for testing

---

### EmbeddingsService

Provides embeddings functionality for similarity search, clustering, and classification.

#### Features
- ✅ Text embeddings
- ✅ Similarity search
- ✅ Document clustering (K-means)
- ✅ Text classification
- ✅ Duplicate detection

#### Example

```javascript
import { EmbeddingsService } from './services/embeddings-service.js';

const service = new EmbeddingsService();

// Get embeddings
const embeddings = await service.getEmbeddings(['Text 1', 'Text 2']);

// Find similar documents
const results = await service.findSimilarDocuments(
  'What is machine learning?',
  [
    'Document about AI',
    'Document about machine learning',
    'Document about cooking'
  ],
  { topK: 2, threshold: 0.7 }
);
console.log(results[0].document); // Most similar
console.log(results[0].similarity); // Similarity score

// Cluster documents
const clusters = await service.clusterDocuments([
  'Document 1 about AI',
  'Document 2 about AI',
  'Document 3 about cooking',
  'Document 4 about cooking'
], k=2);
console.log(clusters); // { 0: [...], 1: [...] }

// Classify text
const classification = await service.classifyText(
  'This is a great product!',
  {
    positive: ['Great!', 'Amazing!', 'Love it!'],
    negative: ['Terrible', 'Bad', 'Hate it']
  }
);
console.log(classification.category); // 'positive'
console.log(classification.confidence); // 0.85

// Find duplicates
const duplicates = await service.findDuplicates(
  ['Text 1', 'Text 2', 'Text 1 copy'],
  threshold=0.95
);
console.log(duplicates); // [{ text1: 'Text 1', text2: 'Text 1 copy', similarity: 0.98 }]
```

#### API

- `getEmbeddings(texts)` - Get embeddings for text(s)
- `findSimilarDocuments(query, documents, options)` - Find similar documents
- `clusterDocuments(documents, k, maxIterations)` - Cluster documents
- `classifyText(texts, trainingExamples)` - Classify text(s)
- `findDuplicates(texts, threshold)` - Find duplicate content

---

### ModelComparisonService

Compare outputs from different AI models side-by-side.

#### Features
- ✅ Compare multiple models
- ✅ Analyze differences
- ✅ Side-by-side comparison formatting
- ✅ Provider-specific options

#### Example

```javascript
import { ModelComparisonService } from './services/model-comparison-service.js';

const service = new ModelComparisonService();

// Compare models
const results = await service.compareModels('What is AI?', {
  temperature: 0.7,
  openai: { max_tokens: 100 },
  claude: { max_tokens: 200 }
});
console.log(results.openai.content);
console.log(results.claude.content);

// Compare query (convenience method)
const queryResults = await service.compareQuery('Explain quantum computing');

// Analyze differences
const analysis = await service.analyzeDifferences('What is machine learning?');
console.log(analysis.comparison.differences);
// Output: "response length varies from 50 to 200 characters; Common themes: machine, learning"

// Side-by-side comparison
const formatted = service.sideBySideComparison(results);
console.log(formatted);
// Output:
// === OPENAI (gpt-4) ===
// Length: 25 characters
// Content: OpenAI response...
// === CLAUDE (claude-sonnet-4-5) ===
// Length: 30 characters
// Content: Claude response...

// Get available models
const models = service.getAvailableModels();
console.log(models); // ['openai', 'claude']
```

#### API

- `compareModels(messages, options)` - Compare all available models
- `compareQuery(query, options)` - Compare query across models
- `analyzeDifferences(messages, options)` - Analyze differences between responses
- `sideBySideComparison(responses)` - Format side-by-side comparison
- `getAvailableModels()` - Get list of available models

---

### PromptService

Provides utilities for various prompt engineering techniques.

#### Features
- ✅ Few-shot learning
- ✅ Chain-of-thought reasoning
- ✅ Role-playing prompts
- ✅ Prompt chaining
- ✅ Self-consistency
- ✅ Structured output prompts

#### Example

```javascript
import { PromptService } from './services/prompt-service.js';

const service = new PromptService();

// Few-shot learning
const examples = [
  { input: 'I love this!', output: 'positive' },
  { input: 'This is terrible', output: 'negative' }
];
const prompt = service.createFewShotPrompt(examples, 'It\'s okay', 'Classify sentiment');
const result = await service.fewShotLearning(examples, 'It\'s okay');

// Chain-of-thought
const cotPrompt = service.createChainOfThoughtPrompt('Solve 2x + 5 = 15');
const reasoning = await service.chainOfThought('Solve 2x + 5 = 15');

// Role-playing
const rolePrompt = service.createRolePlayingPrompt('a math teacher', 'Explain algebra');
const response = await service.rolePlaying('a chef', 'Write a recipe');

// Prompt chaining
const chainResults = await service.promptChain([
  { prompt: 'Step 1: Analyze the problem', options: {} },
  { prompt: 'Step 2: Generate solution', options: {} },
  { prompt: 'Step 3: Verify answer', options: {} }
]);

// Self-consistency
const consistency = await service.selfConsistency(
  'What is 2+2?',
  5, // Generate 5 responses
  { temperature: 0.7 }
);
console.log(consistency.mostCommonAnswer); // Most common answer
console.log(consistency.confidence); // Confidence score (0-1)

// Structured data extraction
const data = await service.extractStructuredData(
  'Contact: Alice, email: alice@example.com',
  {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' }
    }
  }
);
```

#### API

- `createFewShotPrompt(examples, input, taskDescription)` - Create few-shot prompt
- `fewShotLearning(examples, input, options)` - Execute few-shot learning
- `createChainOfThoughtPrompt(problem, steps)` - Create CoT prompt
- `chainOfThought(problem, steps, options)` - Execute CoT reasoning
- `createRolePlayingPrompt(role, question)` - Create role-playing prompt
- `rolePlaying(role, question, options)` - Execute role-playing
- `promptChain(chain)` - Execute prompt chain
- `selfConsistency(prompt, numResponsesOrOptions, options)` - Self-consistency
- `extractStructuredData(text, schema, options)` - Extract structured data

---

### AssistantsService

Manages persistent AI assistants with thread management (OpenAI Assistants API).

#### Features
- ✅ Create assistants
- ✅ Thread management
- ✅ Persistent conversations
- ✅ Tool/function support

#### Example

```javascript
import { AssistantsService } from './services/assistants-service.js';

const service = new AssistantsService();

// Create assistant
const assistant = await service.createAssistant(
  'You are a helpful assistant',
  [{ type: 'code_interpreter' }]
);

// Create thread
const thread = await service.createThread();

// Send message
const message = await service.sendMessage(thread.id, 'What is AI?');

// Get messages
const messages = await service.getMessages(thread.id);
console.log(messages.data[0].content[0].text.value);

// Run assistant
const run = await service.runAssistant(thread.id, assistant.id);
console.log(run.status); // 'completed'
```

#### API

- `createAssistant(instructions, tools)` - Create assistant
- `createThread()` - Create thread
- `sendMessage(threadId, content)` - Send message
- `getMessages(threadId)` - Get messages
- `runAssistant(threadId, assistantId)` - Run assistant
- `waitForRun(threadId, runId)` - Wait for run completion

**Note:** Requires OpenAI standard API key (not Azure OpenAI).

---

### ContextExtractionService

Extracts relevant context from chat history for template generation and other use cases.

#### Features
- ✅ Extract relevant context
- ✅ Filter messages
- ✅ Template context extraction
- ✅ Length management

#### Example

```javascript
import { ContextExtractionService } from './services/contextextraction-service.js';

const service = new ContextExtractionService();

const chatHistory = [
  { role: 'user', content: 'I need help with Python' },
  { role: 'assistant', content: 'I can help with Python' },
  { role: 'user', content: 'How do I use lists?' },
  { role: 'assistant', content: 'Lists in Python are...' }
];

// Extract relevant context
const context = await service.extractRelevantContext(
  chatHistory,
  'Extract information about Python questions',
  { maxContextLength: 1000, includeSystemMessages: false }
);
console.log(context.context);
console.log(context.messageCount);

// Extract template context
const templateContext = await service.extractTemplateContext(
  chatHistory,
  'Python programming help conversation'
);
console.log(templateContext);

// Filter messages
const filtered = service.filterMessages(chatHistory, {
  includeSystemMessages: false,
  filterToolCalls: true
});
```

#### API

- `extractRelevantContext(chatHistory, goal, options)` - Extract relevant context
- `filterMessages(messages, options)` - Filter messages
- `identifyRelevantMessages(messages, goal, maxLength)` - Identify relevant messages
- `extractTemplateContext(chatHistory, templateDescription)` - Extract template context
- `combineMessages(messages)` - Combine messages into string
- `getMessageContent(message)` - Get message content (handles different formats)

---

### State Persistence Service

Manages stateful workflows with checkpointing support.

#### Features
- ✅ Checkpoint storage
- ✅ Stateful agents
- ✅ Task state management
- ✅ State restoration

#### Example

```javascript
import { CheckpointStore, StatefulAgent } from './services/state-persistence-service.js';

const store = new CheckpointStore();
const agent = new StatefulAgent('openai', store);

// Save checkpoint
await agent.checkpoint('thread-123');

// Restore state
const restored = await agent.restore('thread-123');
if (restored) {
  console.log('State restored');
}

// Use in workflow
agent.state.step = 1;
agent.state.results = { step1: 'completed' };
await agent.checkpoint('thread-123');
```

#### API

**CheckpointStore:**
- `save(threadId, checkpoint)` - Save checkpoint
- `getLatest(threadId)` - Get latest checkpoint
- `getAll(threadId)` - Get all checkpoints
- `clear(threadId)` - Clear checkpoints

**StatefulAgent:**
- `checkpoint(threadId)` - Save current state
- `restore(threadId)` - Restore state
- `reset()` - Reset state

---

## Common Patterns

### Error Handling

```javascript
try {
  const response = await service.chat(messages);
  console.log(response.content);
} catch (error) {
  if (error.status === 429) {
    // Rate limit - retry with backoff
    console.error('Rate limited, retrying...');
  } else if (error.status === 401) {
    // Authentication error
    console.error('Invalid API key');
  } else {
    console.error('Error:', error.message);
  }
}
```

### Provider Selection

```javascript
// Use default provider
const service1 = new ChatService();

// Explicitly specify provider
const service2 = new ChatService('openai');
const service3 = new ChatService('claude');

// Check provider availability
import { providerUtils } from '../config.js';
if (providerUtils.isProviderAvailable('openai')) {
  // Use OpenAI
}
```

### Streaming Responses

```javascript
const service = new ChatService();

await service.chatStream(
  [{ role: 'user', content: 'Tell me a story' }],
  (chunk) => {
    process.stdout.write(chunk);
  }
);
```

### Batch Operations

```javascript
// Process multiple items
const service = new EmbeddingsService();
const texts = ['Text 1', 'Text 2', 'Text 3'];
const embeddings = await service.getEmbeddings(texts);
// Process all embeddings...
```

---

## Error Handling

All services throw errors that should be caught and handled:

### Common Error Types

- **Network Errors**: Connection issues, timeouts
- **API Errors**: Rate limits (429), authentication (401), server errors (5xx)
- **Validation Errors**: Invalid input parameters
- **Provider Errors**: Provider-specific errors

### Best Practices

```javascript
try {
  const result = await service.someMethod(...);
} catch (error) {
  // Log error
  console.error('Service error:', error);
  
  // Handle specific error types
  if (error.status === 429) {
    // Implement retry with exponential backoff
  } else if (error.status >= 500) {
    // Server error - retry later
  } else {
    // Client error - don't retry
  }
}
```

---

## Best Practices

### 1. **Reuse Service Instances**

```javascript
// ✅ Good - reuse instance
const service = new ChatService();
const response1 = await service.chat(messages1);
const response2 = await service.chat(messages2);

// ❌ Bad - create new instance each time
const response1 = await new ChatService().chat(messages1);
const response2 = await new ChatService().chat(messages2);
```

### 2. **Handle Errors Gracefully**

```javascript
// ✅ Good
try {
  const result = await service.chat(messages);
} catch (error) {
  // Handle error appropriately
  console.error('Chat failed:', error.message);
  // Provide fallback or user-friendly message
}

// ❌ Bad
const result = await service.chat(messages); // Unhandled error
```

### 3. **Use Appropriate Options**

```javascript
// ✅ Good - use appropriate temperature
const response = await service.chat(messages, {
  temperature: 0.7, // For creative tasks
  max_tokens: 500   // Limit response length
});

// ✅ Good - use low temperature for structured output
const data = await service.getStructuredOutput(messages, {
  temperature: 0    // For consistent output
});
```

### 4. **Validate Inputs**

```javascript
// ✅ Good - validate before calling service
if (!messages || messages.length === 0) {
  throw new Error('Messages cannot be empty');
}
const response = await service.chat(messages);
```

### 5. **Use Streaming for Better UX**

```javascript
// ✅ Good - stream long responses
await service.chatStream(messages, (chunk) => {
  process.stdout.write(chunk);
});

// ❌ Bad - wait for full response for long content
const fullResponse = await service.chat(messages);
console.log(fullResponse.content); // User waits longer
```

### 6. **Cache When Appropriate**

```javascript
// ✅ Good - cache embeddings for repeated queries
const cache = new Map();
async function getCachedEmbeddings(text) {
  if (cache.has(text)) {
    return cache.get(text);
  }
  const embeddings = await service.getEmbeddings(text);
  cache.set(text, embeddings);
  return embeddings;
}
```

---

## Additional Resources

- [Main README](../../README.md) - Project overview
- [TUTORIAL.md](../../TUTORIAL.md) - Comprehensive tutorial
- [Client Interface Documentation](../clients/README.md) - Low-level client API
- [Examples](../examples/) - Usage examples

---

## Contributing

When adding new services:
1. Follow the existing service pattern
2. Add comprehensive JSDoc with examples
3. Include error handling
4. Add tests in `tests/services/`
5. Update this README

---

**Last Updated:** 2024
