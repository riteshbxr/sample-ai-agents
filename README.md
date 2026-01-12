# AI Agents Demo - JavaScript Implementation

A modern JavaScript project demonstrating the latest AI trends used by tech startups, featuring implementations with OpenAI and Claude APIs.

## 🚀 Features

- **OpenAI Integration** - Full support for GPT-4, function calling, streaming, and Assistants API
- **Claude Integration** - Support for Claude Sonnet 4.5, tool use, and streaming
- **RAG (Retrieval-Augmented Generation)** - Vector search with LLM for domain-specific knowledge
- **Function Calling Agents** - AI agents that can use tools and perform actions
- **Streaming Responses** - Real-time token streaming for better UX
- **Multi-Model Support** - Compare and use different AI models
- **Structured Outputs** - JSON mode and structured data extraction
- **Multi-Agent Collaboration** - Multiple agents working together
- **Error Handling & Retries** - Production-ready error handling patterns
- **Cost Tracking** - Token usage and cost monitoring
- **Batch Processing** - Efficient parallel request handling
- **Memory Management** - Advanced conversation context handling
- **Prompt Engineering** - Advanced prompting techniques
- **Vision/Image Analysis** - Image understanding capabilities
- **Agentic Workflows** - Multi-step autonomous workflows
- **Structured Logging** - Configurable logging with levels and metadata
- **Type Safety** - Comprehensive JSDoc type annotations
- **Code Quality** - ESLint, Prettier, and pre-commit hooks

## 📋 Prerequisites

- Node.js 18+ (with ES modules support)
- API keys from:
  - [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) (Recommended)
  - [OpenAI](https://platform.openai.com/api-keys) (Alternative)
  - [Anthropic](https://console.anthropic.com/) (Optional)

## 🛠️ Installation

1. Clone or navigate to the project directory:
```bash
cd "AI Agents"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```
   > **Note:** If `env.example` doesn't exist, create a `.env` file manually with the variables shown below.

4. Edit `.env` and add your API keys:

**Azure OpenAI** (Recommended)
```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

**Option 2: Standard OpenAI** (Alternative)
```env
OPENAI_API_KEY=your_openai_api_key_here
```

**Option 3: Default Provider Configuration**
When using `createAIClient('openai')`, control which provider is used:
```env
OPENAI_DEFAULT_PROVIDER=azure-openai  # Use Azure OpenAI (default)
# or
OPENAI_DEFAULT_PROVIDER=openai-standard  # Use Standard OpenAI
```
This allows switching between Azure and Standard OpenAI without code changes.

**Claude (Optional)**
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# Optional: Override default model
# CLAUDE_MODEL=claude-sonnet-4-5-20250929
```

## 🎯 Usage

### Interactive Menu (Recommended)

Run the interactive menu to browse and select examples:

```bash
npm start
# or
npm run menu
```

This will display a menu with all available examples organized by category. Simply select a number to run any example.

### Direct Command Execution

You can also run examples directly using npm scripts:

### 📦 Direct SDK Usage Examples

These examples demonstrate direct usage of OpenAI/Claude SDK APIs:

#### Interactive Chat Example
Full conversational interface with back-and-forth interaction:
```bash
npm run demo:interactive-chat
```
Features:
- Continuous conversation loop
- Conversation history maintained across messages
- Special commands: `/help`, `/clear`, `/stats`, `/exit`
- Works with both OpenAI and Claude
- Graceful error handling

#### Simple Chat Example
Basic chat completion with OpenAI or Claude:
```bash
npm run demo:chat
```

#### Streaming Example
Real-time token streaming:
```bash
npm run demo:streaming
```

#### Multi-Model Comparison
Compare outputs from different models:
```bash
npm run demo:multi-model
```

#### Structured Output Example
Get consistent, parseable JSON responses from AI models:
```bash
npm run demo:structured
```
Demonstrates JSON mode, data extraction, and structured data generation.

#### OpenAI Assistants API
Persistent AI assistants with thread management:
```bash
npm run demo:assistants
```
Demonstrates assistant creation, threads, and persistent conversations.

#### Claude Assistants-like (Messages API)
Persistent conversations with tool use using Claude's Messages API:
```bash
npm run demo:claude-assistants
```
Demonstrates similar patterns to OpenAI Assistants API using Claude's Messages API with tool use capabilities.

#### Standalone Embeddings
Embeddings beyond RAG - similarity, clustering, classification:
```bash
npm run demo:embeddings
```
Demonstrates semantic search, document clustering, and text classification.

#### Vision/Image Analysis
Image understanding and analysis capabilities:
```bash
npm run demo:vision
```
Demonstrates image description, OCR, visual Q&A, and code extraction.

### 🎯 Higher-Level Strategy Examples

These examples demonstrate advanced patterns, strategies, and architectural approaches:

#### Function Calling Agent
AI agent that can use tools/functions:
```bash
npm run demo:agent
```

#### RAG Example
Retrieval-Augmented Generation with vector search:
```bash
npm run demo:rag
```

#### Multi-Agent Collaboration
Multiple AI agents working together on complex tasks:
```bash
npm run demo:multi-agent
```
Shows research, writing, and review agents collaborating.

#### Error Handling & Retry Patterns
Production-ready error handling with exponential backoff:
```bash
npm run demo:error-handling
```
Includes retry logic, circuit breakers, and graceful degradation.

#### Cost Tracking
Monitor token usage and estimate API costs:
```bash
npm run demo:cost-tracking
```
Track costs by provider, model, and request type.

#### Batch Processing
Efficient processing of multiple requests in parallel:
```bash
npm run demo:batch
```
Demonstrates parallel processing, rate limiting, and sequential workflows.

#### Memory Management
Advanced conversation handling with context window management:
```bash
npm run demo:memory
```
Includes automatic summarization, context window management, and persistence.

#### Prompt Engineering Techniques
Advanced prompting strategies and techniques (includes Chain-of-Thought reasoning):
```bash
npm run demo:prompts
```
Covers 10+ techniques: few-shot learning, chain-of-thought reasoning, role-playing, output formatting, constrained generation, self-consistency, prompt chaining, negative prompting, temperature tuning, and meta-prompting.

#### Agentic Workflows
Multi-step autonomous workflows with decision-making:
```bash
npm run demo:workflow
```
Shows linear, iterative, conditional, and parallel workflows.

#### Security & Prompt Injection Prevention
Security best practices for AI applications:
```bash
npm run demo:security
```
Includes input sanitization, prompt injection detection, and validation.

#### Response Caching
Caching strategies to reduce costs and improve latency:
```bash
npm run demo:caching
```
Includes cache management, invalidation, and cost savings analysis.

#### Token Counting & Optimization
Token counting strategies and prompt optimization:
```bash
npm run demo:tokens
```
Demonstrates token estimation, prompt optimization, and budget management.

#### Evaluation & Testing Strategies
Evaluate and test AI responses for quality and consistency:
```bash
npm run demo:evaluation
```
Includes quality evaluation, A/B testing, and automated test suites.

### Advanced Examples (Legacy - See Above)


## 📁 Project Structure

```
ai-agents/
├── src/
│   ├── config.js                    # Configuration and environment setup
│   ├── menu.js                      # Interactive example selector
│   ├── clients/
│   │   ├── ai-client-interface.js  # Unified client interface
│   │   ├── azure-openai-client.js  # Azure OpenAI API client
│   │   ├── standard-openai-client.js # Standard OpenAI API client
│   │   ├── claude-client.js         # Claude API client
│   │   └── README.md                # Client interface documentation
│   ├── agents/
│   │   ├── rag-agent.js             # RAG implementation
│   │   └── function-calling-agent.js # Function calling agent
│   ├── utils/
│   │   ├── simple-vector-store.js   # In-memory vector store
│   │   ├── token-utils.js           # Token counting utilities
│   │   ├── cost-utils.js             # Cost calculation utilities
│   │   └── similarity-utils.js      # Similarity calculation utilities
│   └── examples/
│       ├── sdk-usage/               # Direct SDK usage examples
│       │   ├── simple-chat.js                    # Basic chat example
│       │   ├── interactive-chat.js               # Interactive chat interface
│       │   ├── streaming-example.js              # Streaming example
│       │   ├── multi-model-example.js            # Multi-model comparison
│       │   ├── structured-output-example.js     # JSON mode & structured outputs
│       │   ├── assistants-api-example.js         # OpenAI Assistants API
│       │   ├── claude-assistants-example.js      # Claude Messages API
│       │   ├── embeddings-example.js             # Standalone embeddings
│       │   ├── vision-example.js                 # Vision/image analysis
│       │   ├── langgraph-example.js              # LangGraph workflows
│       │   └── langfuse-example.js                # Langfuse observability
│       └── strategies/              # Higher-level strategies and patterns
│           ├── agent-example.js                  # Function calling example
│           ├── rag-example.js                     # RAG example
│           ├── multi-agent/                      # Multi-agent systems
│           ├── a2a-agent/                        # Agent-to-agent communication
│           ├── react-agent/                      # ReAct pattern
│           ├── agent-orchestration/              # Agent orchestration
│           ├── error-handling/                   # Error handling & retries
│           ├── cost-tracking/                    # Cost tracking
│           ├── batch/                            # Batch processing
│           ├── memory/                           # Memory management
│           ├── prompt-techniques-example.js      # Prompt engineering
│           ├── workflow/                          # Agentic workflows
│           ├── security/                         # Security & prompt injection
│           ├── caching/                          # Response caching
│           ├── token-optimization/               # Token optimization
│           ├── evaluation/                       # Evaluation & testing
│           ├── context-extraction/              # Context extraction
│           └── state-persistence/               # State persistence
├── package.json
├── env.example                      # Environment variables template
├── .env                             # Your API keys (not in git)
├── README.md                         # This file
└── TUTORIAL.md                      # Comprehensive tutorial
```

## 💡 Code Examples

### Basic Chat with OpenAI

```javascript
import { createAIClient } from './src/clients/client-factory.js';

// Use factory function (recommended)
const client = createAIClient('openai');  // Uses defaultProvider setting
// or explicitly:
const azureClient = createAIClient('azure-openai');
const standardClient = createAIClient('openai-standard');
const response = await client.chat([
  { role: 'user', content: 'Hello, how are you?' }
]);
console.log(response.choices[0].message.content);
```

### Streaming with Claude

```javascript
import { ClaudeClient } from './src/clients/claude-client.js';

const client = new ClaudeClient();
await client.chatStream(
  [{ role: 'user', content: 'Tell me a story' }],
  (chunk) => process.stdout.write(chunk)
);
```

### Function Calling Agent

```javascript
import { FunctionCallingAgent } from './src/agents/function-calling-agent.js';

const agent = new FunctionCallingAgent('openai');

// Register a function
agent.registerFunction(
  'sendEmail',
  'Send an email',
  {
    type: 'object',
    properties: {
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' }
    },
    required: ['to', 'subject', 'body']
  },
  async ({ to, subject, body }) => {
    // Your email sending logic
    return { success: true };
  }
);

// Use the agent
const response = await agent.chat('Send an email to john@example.com');
```

### RAG Agent

```javascript
import { RAGAgent } from './src/agents/rag-agent.js';

const ragAgent = new RAGAgent();

// Add documents to vector store
await ragAgent.addDocuments([
  'Document 1 content...',
  'Document 2 content...'
]);

// Query with RAG
const answer = await ragAgent.query('What is in the documents?');
```

## 🧠 AI Strategies & Techniques Implemented

This project demonstrates **21+ core AI strategies** across **30+ example files**, organized into two categories:

### 📦 Direct SDK Usage Examples

These examples show direct usage of OpenAI/Claude SDK APIs:

#### 1. **Interactive Chat** (`sdk-usage/interactive-chat.js`)
- **Strategy**: Full conversational interface with continuous interaction
- **Techniques**: Conversation history, command handling, session management
- **Use Cases**: Chatbots, interactive assistants, conversational AI applications

#### 2. **Basic Chat Completion** (`sdk-usage/simple-chat.js`)
- **Strategy**: Synchronous text generation
- **Techniques**: System prompts, message formatting
- **Use Cases**: Q&A, content generation, general conversation

#### 3. **Streaming Responses** (`sdk-usage/streaming-example.js`)
- **Strategy**: Real-time token streaming for better UX
- **Techniques**: Incremental response delivery, chunk processing
- **Use Cases**: Chat interfaces, long-form content, real-time feedback

#### 4. **Multi-Model Comparison** (`sdk-usage/multi-model-example.js`)
- **Strategy**: Comparing outputs from different AI models
- **Techniques**: Parallel queries, response comparison
- **Use Cases**: Model selection, quality assurance, A/B testing

#### 5. **Structured Outputs** (`sdk-usage/structured-output-example.js`)
- **Strategy**: JSON mode for consistent, parseable responses
- **Techniques**: JSON schema enforcement, data extraction, structured generation
- **Use Cases**: API responses, data parsing, ETL pipelines

#### 6. **OpenAI Assistants API** (`sdk-usage/assistants-api-example.js`)
- **Strategy**: Persistent AI assistants with thread management
- **Techniques**: Assistant creation, thread management, persistent conversations
- **Use Cases**: Long-running conversations, support systems, persistent agents

#### 7. **Standalone Embeddings** (`sdk-usage/embeddings-example.js`)
- **Strategy**: Embeddings beyond RAG for various use cases
- **Techniques**: Semantic similarity, clustering, classification, duplicate detection
- **Use Cases**: Document similarity, content organization, recommendation systems

#### 8. **Vision/Image Analysis** (`sdk-usage/vision-example.js`)
- **Strategy**: Multimodal AI for image understanding
- **Techniques**: Image description, OCR, visual Q&A, code extraction
- **Use Cases**: Document processing, image analysis, visual content understanding

### 🎯 Higher-Level Strategy Examples

These examples demonstrate advanced patterns, strategies, and architectural approaches:

#### 9. **Function Calling / Tool Use** (`strategies/agent-example.js`)
- **Strategy**: AI agents using external tools and APIs
- **Techniques**: Function registration, schema definition, tool execution
- **Use Cases**: Email sending, calculations, API integrations, automation

#### 10. **RAG (Retrieval-Augmented Generation)** (`strategies/rag-example.js`)
- **Strategy**: Vector search + LLM for domain-specific knowledge
- **Techniques**: Embeddings, similarity search, context injection
- **Use Cases**: Knowledge bases, document Q&A, domain-specific assistants

#### 11. **Multi-Agent Collaboration** (`strategies/multi-agent/multi-agent-example.js`)
- **Strategy**: Multiple specialized agents working together
- **Techniques**: Agent orchestration, task delegation, result synthesis
- **Use Cases**: Complex workflows, content creation pipelines, research tasks

#### 12. **Error Handling & Retries** (`strategies/error-handling/error-handling-example.js`)
- **Strategy**: Production-ready error handling patterns
- **Techniques**: Exponential backoff, circuit breakers, graceful degradation
- **Use Cases**: Production systems, API reliability, fault tolerance

#### 13. **Cost Tracking & Optimization** (`strategies/cost-tracking/cost-tracking-example.js`)
- **Strategy**: Token usage monitoring and cost optimization
- **Techniques**: Usage tracking, cost calculation, provider comparison
- **Use Cases**: Budget management, cost optimization, usage analytics

#### 13. **Batch Processing** (`strategies/batch-example.js`)
- **Strategy**: Efficient parallel and sequential request handling
- **Techniques**: Concurrency control, rate limiting, sequential dependencies
- **Use Cases**: Bulk operations, data processing, parallel queries

#### 15. **Memory Management** (`strategies/memory/memory-example.js`)
- **Strategy**: Advanced conversation context handling
- **Techniques**: Context summarization, window management, persistence
- **Use Cases**: Long conversations, context optimization, session management

#### 16. **Prompt Engineering** (`strategies/prompt-techniques-example.js`)
- **Strategy**: 10+ advanced prompting techniques
- **Techniques**: 
  - Few-shot learning
  - Chain-of-thought prompting
  - Role-playing
  - Output formatting
  - Constrained generation
  - Self-consistency
  - Prompt chaining
  - Negative prompting
  - Temperature tuning
  - Meta-prompting
- **Use Cases**: Improving model performance, controlling output, specialized tasks

#### 17. **Agentic Workflows** (`strategies/workflow/workflow-example.js`)
- **Strategy**: Multi-step autonomous workflows with decision-making
- **Techniques**: Linear workflows, iterative refinement, conditional logic, parallel tasks
- **Use Cases**: Complex multi-step tasks, autonomous systems, workflow automation

#### 18. **Security & Prompt Injection Prevention** (`strategies/security/security-example.js`)
- **Strategy**: Security best practices for AI applications
- **Techniques**: Input sanitization, injection detection, validation, secure prompts
- **Use Cases**: Production security, preventing prompt manipulation, input validation

#### 19. **Response Caching** (`strategies/caching/caching-example.js`)
- **Strategy**: Caching strategies to reduce costs and latency
- **Techniques**: Cache management, invalidation, TTL, cost savings
- **Use Cases**: Cost optimization, performance improvement, repeated queries

#### 20. **Token Counting & Optimization** (`strategies/token-optimization/token-optimization-example.js`)
- **Strategy**: Token counting and prompt optimization
- **Techniques**: Token estimation, prompt optimization, budget management, context compression
- **Use Cases**: Cost control, prompt efficiency, context window management

#### 21. **Evaluation & Testing Strategies** (`strategies/evaluation/evaluation-example.js`)
- **Strategy**: Evaluate and test AI responses for quality
- **Techniques**: Quality evaluation, consistency testing, A/B testing, automated test suites
- **Use Cases**: Quality assurance, prompt optimization, regression testing

### Strategy Overlap Analysis

**Note on Redundancy**: Examples have been optimized to remove redundancy:
- **Chain-of-Thought Reasoning**: Covered comprehensively in `strategies/prompt-techniques-example.js` (one of 10+ techniques)
- **Function Calling**: `strategies/agent-example.js` demonstrates basics, `strategies/workflow-example.js` shows advanced orchestration
- **Embeddings**: `strategies/rag-example.js` shows RAG usage, `sdk-usage/embeddings-example.js` shows standalone use cases
- **Cost Tracking vs Token Optimization**: `strategies/cost-tracking-example.js` tracks costs, `strategies/token-optimization-example.js` optimizes prompts
- **All examples add unique value** and demonstrate different aspects of AI application development

### Quick Reference: AI Strategies by Example

### 📦 Direct SDK Usage Examples

| Example | Strategy | Key Techniques | Complexity |
|---------|----------|----------------|------------|
| `sdk-usage/interactive-chat.js` | Interactive Chat | Conversation history, command handling | ⭐ Beginner |
| `sdk-usage/simple-chat.js` | Basic Chat | System prompts, message formatting | ⭐ Beginner |
| `sdk-usage/streaming-example.js` | Streaming | Real-time tokens, chunk processing | ⭐ Beginner |
| `sdk-usage/multi-model-example.js` | Model Comparison | Parallel queries, response comparison | ⭐ Beginner |
| `sdk-usage/structured-output-example.js` | Structured Outputs | JSON mode, data extraction | ⭐⭐ Intermediate |
| `sdk-usage/assistants-api-example.js` | Assistants API | Persistent assistants, thread management | ⭐⭐⭐ Advanced |
| `sdk-usage/embeddings-example.js` | Standalone Embeddings | Similarity, clustering, classification | ⭐⭐ Intermediate |
| `sdk-usage/vision-example.js` | Multimodal AI | Image analysis, OCR, visual Q&A | ⭐⭐ Intermediate |

### 🎯 Higher-Level Strategy Examples

| Example | Strategy | Key Techniques | Complexity |
|---------|----------|----------------|------------|
| `strategies/agent-example.js` | Function Calling | Tool registration, schema definition | ⭐⭐ Intermediate |
| `strategies/rag-example.js` | RAG | Embeddings, vector search, context injection | ⭐⭐ Intermediate |
| `strategies/multi-agent/multi-agent-example.js` | Multi-Agent | Agent orchestration, task delegation | ⭐⭐⭐ Advanced |
| `strategies/a2a-agent/a2a-agent-example.js` | Agent-to-Agent | Direct messaging, negotiation | ⭐⭐⭐ Advanced |
| `strategies/react-agent/react-agent-example.js` | ReAct Pattern | Reasoning + Acting loop | ⭐⭐⭐ Advanced |
| `strategies/agent-orchestration/agent-orchestration-example.js` | Agent Orchestration | Intelligent tool routing | ⭐⭐⭐ Advanced |
| `strategies/error-handling/error-handling-example.js` | Error Handling | Retries, circuit breakers, fallbacks | ⭐⭐⭐ Advanced |
| `strategies/cost-tracking/cost-tracking-example.js` | Cost Optimization | Usage tracking, cost calculation | ⭐⭐ Intermediate |
| `strategies/batch/batch-example.js` | Batch Processing | Concurrency, rate limiting, dependencies | ⭐⭐⭐ Advanced |
| `strategies/memory/memory-example.js` | Memory Management | Context summarization, window management | ⭐⭐⭐ Advanced |
| `strategies/prompt-techniques-example.js` | Prompt Engineering | 10+ techniques (few-shot, CoT, role-playing, etc.) | ⭐⭐ Intermediate |
| `strategies/workflow/workflow-example.js` | Agentic Workflows | Multi-step orchestration, decision-making | ⭐⭐⭐ Advanced |
| `strategies/security/security-example.js` | Security | Input sanitization, injection prevention | ⭐⭐ Intermediate |
| `strategies/caching/caching-example.js` | Response Caching | Cache management, cost optimization | ⭐⭐ Intermediate |
| `strategies/token-optimization/token-optimization-example.js` | Token Optimization | Token counting, prompt optimization | ⭐⭐ Intermediate |
| `strategies/evaluation/evaluation-example.js` | Evaluation & Testing | Quality evaluation, A/B testing | ⭐⭐⭐ Advanced |
| `strategies/context-extraction/context-extraction-example.js` | Context Extraction | Extract relevant context from history | ⭐⭐ Intermediate |
| `strategies/state-persistence/state-persistence-example.js` | State Persistence | Checkpointing and state management | ⭐⭐⭐ Advanced |

## 🔧 Azure OpenAI Setup

This project prioritizes Azure OpenAI. To use Azure OpenAI:

1. Set the following environment variables in your `.env` file:
```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

2. The client will automatically detect Azure configuration and use the Azure endpoint.

**Note:** 
- When using Azure OpenAI, the deployment name is used as the model identifier. Make sure your deployment name matches the model you want to use (e.g., `gpt-4-turbo-preview`).
- For RAG functionality, you need a separate embedding deployment (e.g., `text-embedding-ada-002` or `text-embedding-3-small`). Set `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` to your embedding deployment name.

## 📚 API Reference

### OpenAIClient

- `chat(messages, options)` - Basic chat completion
- `chatStream(messages, onChunk, options)` - Streaming chat
- `chatWithFunctions(messages, functions, options)` - Function calling
- `createAssistant(instructions, tools)` - Create an assistant
- `getEmbeddings(input)` - Get embeddings for RAG

### ClaudeClient

- `chat(messages, options)` - Basic chat completion
- `chatStream(messages, onChunk, options)` - Streaming chat
- `chatWithTools(messages, tools, options)` - Tool use
- `getTextContent(response)` - Extract text from response

### RAGAgent

- `addDocuments(documents, metadatas, ids)` - Add documents to vector store
- `query(question, topK, options)` - Query with RAG
- `queryStream(question, onChunk, topK)` - Streaming RAG query
- `deleteDocuments(ids)` - Delete documents
- `getStats()` - Get collection stats

### FunctionCallingAgent

- `registerFunction(name, description, parameters, implementation)` - Register a function
- `chat(userMessage, options)` - Chat with function calling
- `resetConversation()` - Reset conversation history

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure
- Use environment variables for all sensitive data
- Consider using a secrets management service for production

## 📖 Example Descriptions

### 📦 Direct SDK Usage Examples
- **Simple Chat** - Basic chat completion with OpenAI/Claude
- **Interactive Chat** - Full conversational interface with back-and-forth interaction
- **Streaming** - Real-time token streaming for better UX
- **Multi-Model** - Compare outputs from different AI models
- **Structured Output** - Get consistent JSON responses for data extraction
- **Assistants API** - Persistent AI assistants with thread management (OpenAI)
- **Claude Assistants-like** - Persistent conversations with tool use (Claude Messages API)
- **Embeddings** - Standalone embeddings for similarity, clustering, classification
- **Vision** - Image analysis, OCR, and visual question answering
- **LangGraph** - Stateful, multi-actor agent workflows
- **Langfuse** - LLM observability, tracing, and monitoring

### 🎯 Higher-Level Strategy Examples
- **Function Calling Agent** - Agents that can use tools and functions
- **ReAct Agent** - ReAct (Reasoning + Acting) pattern
- **Agent Orchestration** - Intelligent tool routing/dispatching
- **RAG** - Retrieval-Augmented Generation with vector search
- **Multi-Agent** - Multiple specialized agents collaborating on tasks
- **Agent-to-Agent (A2A)** - Direct agent-to-agent messaging and negotiation
- **Agentic Workflows** - Multi-step autonomous workflows
- **Error Handling** - Production-ready error handling with retries
- **Cost Tracking** - Monitor token usage and API costs
- **Batch Processing** - Efficient parallel and sequential processing
- **Memory Management** - Advanced conversation context handling
- **Context Extraction** - Extract relevant context from chat history
- **State Persistence** - Checkpointing and state management
- **Prompt Engineering** - 10+ advanced prompting techniques
- **Security** - Input sanitization and prompt injection prevention
- **Caching** - Response caching to reduce costs and improve latency
- **Token Optimization** - Token counting and prompt optimization strategies
- **Evaluation** - Quality evaluation, A/B testing, and automated test suites

## 🤝 Contributing

Feel free to extend this project with:
- More agent types
- Additional vector database integrations
- UI components (React, Vue, etc.)
- More example use cases
- Error handling improvements
- Additional AI model integrations

## 📝 License

MIT

## 🙏 Acknowledgments

- OpenAI for the GPT models and API
- Anthropic for Claude models and API
- Azure OpenAI for enterprise AI services

---

**Built with ❤️ to demonstrate the latest AI trends for tech startups**
