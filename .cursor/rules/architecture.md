---
description: System architecture - client factory, unified interface, data flows
globs:
  - src/clients/**
  - src/agents/**
  - src/services/**
---

# Architecture Overview

This document explains the system architecture and how components interact.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Examples   │  │   Agents    │  │        Services         │  │
│  │ (sdk-usage) │  │ (RAG, Func) │  │ (Chat, Vision, etc.)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Client Factory                          │  │
│  │                 createAIClient(provider)                   │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐      ┌─────────────┐      │
│  │   OpenAI    │     │    Azure    │      │   Claude    │      │
│  │   Client    │     │   Client    │      │   Client    │      │
│  └──────┬──────┘     └──────┬──────┘      └──────┬──────┘      │
│         │                   │                    │              │
└─────────┼───────────────────┼────────────────────┼──────────────┘
          ▼                   ▼                    ▼
    ┌──────────┐        ┌──────────┐         ┌──────────┐
    │  OpenAI  │        │  Azure   │         │ Anthropic│
    │   API    │        │  API     │         │   API    │
    └──────────┘        └──────────┘         └──────────┘
```

## Core Components

### 1. Client Factory (`src/clients/client-factory.js`)

The central entry point for creating AI clients. Provides:
- **Provider routing**: Routes `'openai'` to Azure or Standard based on config
- **Explicit providers**: `'azure-openai'`, `'openai-standard'`, `'claude'`
- **Fallback support**: `createAIClientWithFallback(['openai', 'claude'])`

```javascript
// Smart routing based on OPENAI_DEFAULT_PROVIDER
const client = createAIClient('openai');

// Explicit provider selection
const azure = createAIClient('azure-openai');
const claude = createAIClient('claude');
```

### 2. Unified Client Interface (`src/clients/ai-client-interface.js`)

Abstract interface that all clients implement:

```
┌─────────────────────────────────────────────────────────┐
│                   AIClientInterface                      │
├─────────────────────────────────────────────────────────┤
│ + chat(messages, options)                               │
│ + chatStream(messages, onChunk, options)                │
│ + chatWithTools(messages, tools, options)               │
│ + getTextContent(response)                              │
│ + hasToolUse(response)                                  │
│ + getToolUseBlocks(response)                            │
└─────────────────────────────────────────────────────────┘
                          △
                          │ implements
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────┴───────┐ ┌───────┴───────┐ ┌───────┴───────┐
│ StandardOpenAI│ │ AzureOpenAI   │ │ ClaudeClient  │
│    Client     │ │   Client      │ │               │
└───────────────┘ └───────────────┘ └───────────────┘
```

### 3. Client Wrappers (Middleware Pattern)

Wrappers add functionality without modifying core clients:

```
┌─────────────────────────────────────────────────────────┐
│                    LoggingClient                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                 ResilientClient                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              Base AI Client                  │  │  │
│  │  │         (OpenAI/Azure/Claude)               │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Available Wrappers:**
- `ResilientClient`: Retry logic, exponential backoff, circuit breaker
- `LoggingClient`: Request/response logging
- `CostTrackingClient`: Token usage and cost tracking

### 4. Agents (`src/agents/`)

Higher-level abstractions built on clients:

```
┌─────────────────────────────────────────────────────────┐
│                  FunctionCallingAgent                    │
├─────────────────────────────────────────────────────────┤
│ - client: AIClientInterface                             │
│ - functions: Map<name, {schema, impl}>                  │
│ - conversationHistory: Message[]                        │
├─────────────────────────────────────────────────────────┤
│ + registerFunction(name, desc, schema, impl)            │
│ + chat(message) → executes tools, returns response      │
│ + resetConversation()                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                       RAGAgent                           │
├─────────────────────────────────────────────────────────┤
│ - client: AIClientInterface                             │
│ - vectorStore: SimpleVectorStore                        │
├─────────────────────────────────────────────────────────┤
│ + addDocuments(docs, metadata)                          │
│ + query(question, topK) → retrieves + generates         │
│ + queryStream(question, onChunk, topK)                  │
└─────────────────────────────────────────────────────────┘
```

### 5. Services (`src/services/`)

Domain-specific service abstractions:

| Service | Purpose |
|---------|---------|
| `ChatService` | Simple chat, streaming, structured outputs |
| `VisionService` | Image analysis, OCR, visual Q&A |
| `EmbeddingsService` | Similarity search, clustering |
| `AssistantsService` | Persistent assistants with threads |
| `PromptService` | Prompt engineering techniques |

## Data Flow

### Basic Chat Request

```
User Message
     │
     ▼
┌─────────────┐
│   Example   │
│    Code     │
└──────┬──────┘
       │ createAIClient('openai')
       ▼
┌─────────────┐
│   Client    │
│   Factory   │
└──────┬──────┘
       │ routes to appropriate client
       ▼
┌─────────────┐
│  AI Client  │
│ (OpenAI/etc)│
└──────┬──────┘
       │ API request
       ▼
┌─────────────┐
│  External   │
│    API      │
└──────┬──────┘
       │ response
       ▼
┌─────────────┐
│  AI Client  │ client.getTextContent(response)
└──────┬──────┘
       │
       ▼
  Final Text
```

### Function Calling Flow

```
User: "Send email to john@example.com"
                │
                ▼
┌───────────────────────────────┐
│     FunctionCallingAgent      │
│  1. Send to LLM with tools    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          AI Client            │
│  LLM decides: call sendEmail  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     FunctionCallingAgent      │
│  2. Execute sendEmail()       │
│  3. Return result to LLM      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          AI Client            │
│  LLM generates final response │
└───────────────┬───────────────┘
                │
                ▼
Response: "I've sent the email to john@example.com"
```

### RAG Query Flow

```
User Question: "What is X?"
                │
                ▼
┌───────────────────────────────┐
│          RAGAgent             │
│  1. Generate query embedding  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       Vector Store            │
│  2. Find similar documents    │
│     (cosine similarity)       │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          RAGAgent             │
│  3. Build prompt with context │
│  4. Send to LLM               │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          AI Client            │
│  5. Generate answer           │
└───────────────┬───────────────┘
                │
                ▼
Answer based on retrieved documents
```

## Configuration Flow

```
┌─────────────────────────────────────────────────────────┐
│                     Environment                          │
│  .env file / process.env                                │
│  - AZURE_OPENAI_* / OPENAI_API_KEY / ANTHROPIC_API_KEY  │
│  - OPENAI_DEFAULT_PROVIDER                              │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   src/config.js                          │
│  - Loads and validates environment                      │
│  - Provides providerUtils for routing                   │
│  - Exports config object                                │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Client Factory                         │
│  - Uses config for provider routing                     │
│  - Creates appropriate client instance                  │
└─────────────────────────────────────────────────────────┘
```

## Provider Capabilities Matrix

| Feature | OpenAI Standard | Azure OpenAI | Claude |
|---------|----------------|--------------|--------|
| Chat | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ |
| Function/Tool Calling | ✅ | ✅ | ✅ |
| Embeddings | ✅ | ✅ | ❌ |
| Vision | ✅ | ✅ | ✅ |
| Assistants API | ✅ | ❌ | ❌ |
| JSON Mode | ✅ | ✅ | ✅ |

## Extension Points

### Adding a New Client

1. Implement `AIClientInterface` in new file
2. Add to `client-factory.js` switch statement
3. Add configuration in `config.js`
4. Create tests in `tests/clients/`

### Adding a New Agent

1. Create class in `src/agents/`
2. Use `createAIClient()` for AI access
3. Implement domain-specific logic
4. Add example in `src/examples/strategies/`

### Adding a New Service

1. Create class in `src/services/`
2. Accept client via constructor or create internally
3. Provide high-level methods
4. Add tests and documentation

## File Dependencies

```
config.js
    │
    ├──► client-factory.js
    │         │
    │         ├──► standard-openai-client.js
    │         ├──► azure-openai-client.js
    │         ├──► claude-client.js
    │         └──► mock-client.js
    │
    ├──► agents/
    │         ├──► function-calling-agent.js ──► client-factory.js
    │         └──► rag-agent.js ──► client-factory.js
    │
    └──► services/
              └──► *.js ──► client-factory.js
```
