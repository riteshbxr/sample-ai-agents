# Complete AI Tutorial: From Fundamentals to Advanced Agents

A comprehensive tutorial covering everything about AI, based on practical implementations in this project.

## 📚 Table of Contents

1. [Introduction to AI and LLMs](#1-introduction-to-ai-and-llms)
2. [Getting Started with AI APIs](#2-getting-started-with-ai-apis)
3. [Basic Chat Completions](#3-basic-chat-completions)
4. [Advanced Chat Features](#4-advanced-chat-features)
5. [Function Calling and Tool Use](#5-function-calling-and-tool-use)
6. [RAG: Retrieval-Augmented Generation](#6-rag-retrieval-augmented-generation)
7. [Multi-Agent Systems](#7-multi-agent-systems)
8. [Production-Ready Patterns](#8-production-ready-patterns)
9. [Advanced Techniques](#9-advanced-techniques)
10. [Observability and Evaluation](#10-observability-and-evaluation)
11. [Best Practices and Security](#11-best-practices-and-security)
12. [Real-World Applications](#12-real-world-applications)

---

## 1. Introduction to AI and LLMs

### What is AI?

Artificial Intelligence (AI) refers to computer systems that can perform tasks typically requiring human intelligence, such as understanding language, recognizing patterns, and making decisions.

### What are Large Language Models (LLMs)?

Large Language Models (LLMs) are AI systems trained on vast amounts of text data. They can:
- **Generate text**: Write articles, code, stories
- **Understand context**: Maintain conversation history
- **Reason**: Solve problems step-by-step
- **Follow instructions**: Execute complex tasks from natural language

### Key LLM Providers

This project uses two major providers:

1. **OpenAI** (GPT-4, GPT-3.5)
   - Most widely used
   - Strong function calling
   - Assistants API for persistent conversations
   - Vision capabilities

2. **Anthropic Claude** (Claude Sonnet 4.5)
   - Excellent reasoning
   - Strong safety features
   - Tool use capabilities
   - Long context windows
   - Model: `claude-sonnet-4-5-20250929`

### Core Concepts

#### Tokens
- LLMs process text as **tokens** (pieces of words)
- ~4 characters = 1 token (roughly)
- Token limits determine context window size
- Cost is based on tokens used

#### Prompts
- **System prompts**: Define the AI's role and behavior
- **User prompts**: The actual question or task
- **Messages**: Conversation history (system, user, assistant)

#### Temperature
- Controls randomness (0.0 = deterministic, 1.0 = creative)
- Lower = more focused, consistent
- Higher = more creative, varied

**Example from project:**
```javascript
// See: src/examples/sdk-usage/simple-chat.js
const response = await client.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
], { temperature: 0.7 });
```

---

## 2. Getting Started with AI APIs

### Setting Up Your Environment

1. **Install Node.js 18+** (ES modules support required)

2. **Get API Keys:**
   - OpenAI: https://platform.openai.com/api-keys
   - Azure OpenAI: https://azure.microsoft.com/en-us/products/ai-services/openai-service
   - Anthropic: https://console.anthropic.com/

3. **Configure Environment Variables:**
```bash
# .env file
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_DEPLOYMENT=your_deployment_name

# OR standard OpenAI
OPENAI_API_KEY=your_key_here

# Optional: Claude
ANTHROPIC_API_KEY=your_key_here
```

### Project Structure

```
src/
├── clients/          # API client wrappers
│   ├── azure-openai-client.js
│   ├── standard-openai-client.js
│   └── claude-client.js
├── agents/           # Agent implementations
│   ├── function-calling-agent.js
│   └── rag-agent.js
├── utils/            # Helper utilities
└── examples/         # Learning examples
    ├── sdk-usage/    # Direct API usage
    └── strategies/   # Advanced patterns
```

### Running Examples

**Interactive Menu:**
```bash
npm start
# Browse all examples with descriptions
```

**Direct Execution:**
```bash
npm run demo:chat          # Basic chat
npm run demo:streaming     # Streaming responses
npm run demo:agent         # Function calling
npm run demo:rag           # RAG example
```

---

## 3. Basic Chat Completions

### Understanding Chat Completions

Chat completions are the foundation of LLM interactions. You send messages and receive responses.

**Message Format:**
```javascript
[
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is AI?' },
  { role: 'assistant', content: 'AI is...' },
  { role: 'user', content: 'Tell me more.' }
]
```

### Basic Chat Example

**File:** `src/examples/sdk-usage/simple-chat.js`

```javascript
import { AzureOpenAIClient } from '../clients/azure-openai-client.js';
// or
import { StandardOpenAIClient } from '../clients/standard-openai-client.js';

const client = new AzureOpenAIClient();
// or
const client = new StandardOpenAIClient();
const response = await client.chat([
  { role: 'user', content: 'Explain quantum computing in simple terms' }
]);

console.log(response.choices[0].message.content);
```

**Key Concepts:**
- **Synchronous**: Waits for complete response
- **Simple**: One request, one response
- **Use Case**: Simple Q&A, content generation

### Interactive Chat

**File:** `src/examples/sdk-usage/interactive-chat.js`

Maintains conversation history across multiple turns:

```javascript
const conversationHistory = [];

while (true) {
  const userInput = await getUserInput();
  conversationHistory.push({ role: 'user', content: userInput });
  
  const response = await client.chat(conversationHistory);
  const assistantMessage = response.choices[0].message;
  
  conversationHistory.push(assistantMessage);
  console.log(assistantMessage.content);
}
```

**Features:**
- Maintains context across messages
- Special commands (`/help`, `/clear`, `/exit`)
- Error handling
- Works with both OpenAI and Claude

---

## 4. Advanced Chat Features

### Streaming Responses

**Why Streaming?**
- Better user experience (see text appear in real-time)
- Lower perceived latency
- Essential for chat interfaces

**File:** `src/examples/sdk-usage/streaming-example.js`

```javascript
await client.chatStream(
  [{ role: 'user', content: 'Tell me a story' }],
  (chunk) => {
    // Called for each token chunk
    process.stdout.write(chunk);
  }
);
```

**How It Works:**
1. Server sends tokens as they're generated
2. Client receives chunks incrementally
3. User sees text appear in real-time
4. Much better UX than waiting for full response

### Structured Outputs

**Problem:** LLMs generate free-form text, but sometimes you need structured data.

**Solution:** JSON mode and structured outputs

**File:** `src/examples/sdk-usage/structured-output-example.js`

```javascript
const response = await client.chat([
  {
    role: 'user',
    content: 'Extract information from: "John Doe, age 30, works at Acme Corp"'
  }
], {
  response_format: { type: 'json_object' }
});
```

**Use Cases:**
- Data extraction
- API responses
- ETL pipelines
- Structured data generation

### Multi-Model Comparison

**File:** `src/examples/sdk-usage/multi-model-example.js`

Compare outputs from different models:

```javascript
const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-sonnet-4-5-20250929'];
const results = await Promise.all(
  models.map(model => client.chat([...], { model }))
);
```

**Why Compare?**
- Find best model for your use case
- Quality assurance
- A/B testing
- Cost optimization

### Vision/Image Analysis

**File:** `src/examples/sdk-usage/vision-example.js`

LLMs can analyze images:

```javascript
const response = await client.chat([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      { type: 'image_url', image_url: { url: imageUrl } }
    ]
  }
]);
```

**Capabilities:**
- Image description
- OCR (text extraction)
- Visual Q&A
- Code extraction from screenshots

### Embeddings

**File:** `src/examples/sdk-usage/embeddings-example.js`

Embeddings convert text to numerical vectors that capture semantic meaning:

```javascript
const embeddings = await client.getEmbeddings([
  'The cat sat on the mat',
  'The dog played in the yard'
]);

// Calculate similarity
const similarity = cosineSimilarity(embeddings[0], embeddings[1]);
```

**Use Cases:**
- Semantic search
- Document clustering
- Text classification
- Duplicate detection
- Recommendation systems

**Beyond RAG:** Embeddings aren't just for RAG - they're powerful for many tasks!

---

## 5. Function Calling and Tool Use

### What is Function Calling?

Function calling allows LLMs to use external tools and APIs. The AI decides when to call functions based on the conversation.

**File:** `src/agents/function-calling-agent.js`

### How It Works

1. **Register Functions:** Define what tools the AI can use
2. **AI Decides:** LLM determines if/when to call functions
3. **Execute:** Your code runs the function
4. **Return Results:** Function results go back to the LLM
5. **Final Response:** LLM synthesizes the answer

### Example: Email Agent

```javascript
import { FunctionCallingAgent } from './agents/function-calling-agent.js';

const agent = new FunctionCallingAgent('openai');

// Register a function
agent.registerFunction(
  'sendEmail',
  'Send an email to a recipient',
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
    console.log(`Sending email to ${to}`);
    return { success: true, messageId: '123' };
  }
);

// Use the agent
const response = await agent.chat(
  'Send an email to john@example.com saying hello'
);
```

### Function Calling Flow

```
User: "Send an email to john@example.com"
    ↓
LLM: Decides to call sendEmail function
    ↓
System: Executes sendEmail({ to: 'john@example.com', ... })
    ↓
System: Returns result to LLM
    ↓
LLM: Generates final response: "I've sent the email!"
```

### Real-World Use Cases

- **Email/SMS sending**
- **Database queries**
- **API integrations**
- **Calculations**
- **File operations**
- **Web searches**

### OpenAI vs Claude

**OpenAI:**
- Uses `tool_calls` in response
- Multiple functions can be called in parallel
- Function results added as `tool` role messages

**Claude:**
- Uses `tool_use` blocks in content
- Similar concept, different format
- Tool results added as `tool_result` content blocks

**File:** `src/agents/function-calling-agent.js` shows both implementations.

---

## 6. RAG: Retrieval-Augmented Generation

### What is RAG?

**Retrieval-Augmented Generation** combines:
1. **Vector Search**: Find relevant documents
2. **LLM Generation**: Answer using retrieved context

### Why RAG?

**Problem:** LLMs have training data cutoff dates and can't access your private documents.

**Solution:** RAG lets you:
- Use your own knowledge base
- Keep information up-to-date
- Access private/internal documents
- Reduce hallucinations

### How RAG Works

```
1. Documents → Embeddings → Vector Store
2. User Question → Embedding
3. Vector Search → Find Similar Documents
4. Context + Question → LLM → Answer
```

**File:** `src/agents/rag-agent.js`

### RAG Implementation

```javascript
import { RAGAgent } from './agents/rag-agent.js';

const ragAgent = new RAGAgent();

// Step 1: Add documents
await ragAgent.addDocuments([
  'Document 1: AI is transforming industries...',
  'Document 2: Machine learning algorithms...',
  'Document 3: Neural networks consist of...'
]);

// Step 2: Query with RAG
const answer = await ragAgent.query(
  'What is machine learning?',
  topK: 3  // Retrieve top 3 most relevant documents
);
```

### RAG Components

1. **Embeddings Model**: Converts text to vectors
   - OpenAI: `text-embedding-ada-002` or `text-embedding-3-small`
   - Captures semantic meaning

2. **Vector Store**: Stores and searches embeddings
   - This project uses simple in-memory store
   - Production: Use Pinecone, Weaviate, Chroma, etc.

3. **Retrieval**: Find relevant documents
   - Cosine similarity
   - Top-K retrieval

4. **Generation**: LLM creates answer from context

### RAG Best Practices

- **Chunking**: Split large documents into smaller chunks
- **Metadata**: Store document metadata (source, date, etc.)
- **Top-K Selection**: Retrieve 3-5 most relevant chunks
- **Context Window**: Keep retrieved context within token limits
- **Re-ranking**: Optionally re-rank results for better quality

### Streaming RAG

**File:** `src/agents/rag-agent.js` (queryStream method)

```javascript
await ragAgent.queryStream(
  'What is AI?',
  (chunk) => process.stdout.write(chunk),
  topK: 3
);
```

Combines vector search with streaming responses for real-time answers.

---

## 7. Multi-Agent Systems

### What are Multi-Agent Systems?

Multiple specialized AI agents working together to solve complex tasks.

### Why Multi-Agent?

- **Specialization**: Each agent has a specific role
- **Collaboration**: Agents share information
- **Complexity**: Handle tasks too complex for one agent
- **Quality**: Multiple perspectives improve results

### Types of Multi-Agent Systems

#### 1. Hierarchical Multi-Agent

**File:** `src/examples/strategies/multi-agent/multi-agent-system.js`

Agents work in a pipeline:

```
Research Agent → Writing Agent → Review Agent
```

**Example:**
```javascript
import { MultiAgentSystem } from './multi-agent-system.js';

const system = new MultiAgentSystem();

// Agents collaborate on a task
const result = await system.collaborateOnTask(
  'Write a blog post about AI trends in 2024'
);

// Research Agent: Gathers information
// Writing Agent: Creates content
// Review Agent: Reviews and improves
```

#### 2. Agent-to-Agent (A2A) Communication

**File:** `src/examples/strategies/a2a-agent/a2a-multi-agent-system.js`

Agents communicate directly via message bus:

```javascript
import { A2AMultiAgentSystem } from './a2a-multi-agent-system.js';

const system = new A2AMultiAgentSystem();

// Agents send messages to each other
await system.collaborativeResearch('AI trends 2024');

// Research Agent → sends message → Analysis Agent
// Analysis Agent → sends message → Strategy Agent
```

**Key Features:**
- **Message Bus**: Central communication hub
- **Direct Messaging**: Agents can message each other
- **Inbox System**: Agents check messages
- **Coordination**: Coordinator agent manages workflow

#### 3. Agentic Workflows

**File:** `src/examples/strategies/workflow/workflow-agent.js`

Multi-step autonomous workflows:

```javascript
const workflow = {
  steps: [
    { type: 'research', task: 'Gather information' },
    { type: 'analyze', task: 'Analyze data' },
    { type: 'generate', task: 'Create report' },
    { type: 'review', task: 'Review and refine' }
  ],
  conditions: {
    if: 'quality_score < 80',
    then: 'rerun_review_step'
  }
};
```

**Workflow Types:**
- **Linear**: Sequential steps
- **Iterative**: Refine until quality threshold
- **Conditional**: Branch based on results
- **Parallel**: Multiple agents work simultaneously

### Multi-Agent Patterns

#### Pattern 1: Research → Write → Review

```javascript
// Research Agent gathers information
const research = await researchAgent.process('Research topic X');

// Writing Agent creates content
const content = await writingAgent.process(
  `Write about X using: ${research}`
);

// Review Agent improves content
const improved = await reviewAgent.process(
  `Review and improve: ${content}`
);
```

#### Pattern 2: Parallel Processing

```javascript
// Multiple agents work simultaneously
const [research1, research2, research3] = await Promise.all([
  agent1.research('Topic A'),
  agent2.research('Topic B'),
  agent3.research('Topic C')
]);

// Coordinator synthesizes results
const synthesis = await coordinator.synthesize([research1, research2, research3]);
```

#### Pattern 3: Negotiation

**File:** `src/examples/strategies/a2a-agent/a2a-multi-agent-system.js`

Agents negotiate to reach consensus:

```javascript
// Agents debate and negotiate
const negotiation = await system.negotiateTask(
  'What is the best approach to X?',
  agents: ['agent1', 'agent2', 'agent3']
);
```

### When to Use Multi-Agent Systems

✅ **Use When:**
- Complex tasks requiring multiple skills
- Need for quality assurance (review steps)
- Parallel processing needed
- Different perspectives valuable

❌ **Avoid When:**
- Simple tasks (single agent sufficient)
- Cost is a major concern (more agents = more API calls)
- Latency critical (sequential agents add delay)

---

## 8. Production-Ready Patterns

### Error Handling and Retries

**File:** `src/examples/strategies/error-handling/resilient-ai-client.js`

Production systems need robust error handling:

```javascript
import { ResilientAIClient } from './resilient-ai-client.js';

const client = new ResilientAIClient();

// Automatic retries with exponential backoff
const response = await client.chat(messages, {
  maxRetries: 3,
  retryDelay: 1000  // Exponential backoff
});
```

**Key Patterns:**

1. **Exponential Backoff**
   ```javascript
   delay = baseDelay * (2 ^ attemptNumber)
   ```

2. **Circuit Breaker**
   - Stop requests if service is down
   - Auto-recover after timeout
   - Prevents cascading failures

3. **Error Classification**
   - Retryable errors (rate limits, timeouts)
   - Non-retryable errors (invalid API key)
   - Different strategies for each

4. **Graceful Degradation**
   - Fallback to simpler model
   - Cache previous responses
   - Return partial results

**File:** `src/examples/strategies/error-handling/error-handling-example.js`

### Cost Tracking

**File:** `src/examples/strategies/cost-tracking/cost-tracker.js`

Monitor and optimize API costs:

```javascript
import { CostTracker } from './cost-tracker.js';

const tracker = new CostTracker();

const response = await client.chat(messages);
tracker.trackRequest({
  provider: 'openai',
  model: 'gpt-4',
  inputTokens: response.usage.prompt_tokens,
  outputTokens: response.usage.completion_tokens
});

// Get cost summary
const summary = tracker.getSummary();
console.log(`Total cost: $${summary.totalCost}`);
console.log(`By model:`, summary.byModel);
```

**Cost Optimization:**
- Use cheaper models when possible
- Cache responses
- Optimize prompts (fewer tokens)
- Batch requests
- Monitor usage patterns

**File:** `src/examples/strategies/cost-tracking/cost-tracking-example.js`

### Batch Processing

**File:** `src/examples/strategies/batch/batch-processor.js`

Process multiple requests efficiently:

```javascript
import { BatchProcessor } from './batch-processor.js';

const processor = new BatchProcessor({
  concurrency: 5,  // Process 5 at a time
  rateLimit: 60    // 60 requests per minute
});

const tasks = [
  { input: 'Task 1' },
  { input: 'Task 2' },
  // ... 100 more tasks
];

const results = await processor.process(tasks, async (task) => {
  return await client.chat([{ role: 'user', content: task.input }]);
});
```

**Features:**
- **Concurrency Control**: Limit parallel requests
- **Rate Limiting**: Respect API rate limits
- **Sequential Dependencies**: Some tasks depend on others
- **Progress Tracking**: Monitor batch progress

**File:** `src/examples/strategies/batch/batch-example.js`

### Response Caching

**File:** `src/examples/strategies/caching/smart-cache.js`

Cache responses to reduce costs and latency:

```javascript
import { SmartCache } from './smart-cache.js';

const cache = new SmartCache({
  ttl: 3600,  // Cache for 1 hour
  maxSize: 1000
});

const getCachedResponse = async (prompt) => {
  // Check cache first
  const cached = cache.get(prompt);
  if (cached) return cached;

  // Generate new response
  const response = await client.chat([{ role: 'user', content: prompt }]);
  
  // Cache it
  cache.set(prompt, response);
  return response;
};
```

**Cache Strategies:**
- **Exact Match**: Same prompt = cached response
- **Semantic Match**: Similar prompts = similar responses
- **TTL**: Time-to-live for cache entries
- **Invalidation**: Clear cache when data changes

**File:** `src/examples/strategies/caching/caching-example.js`

### Memory Management

**File:** `src/examples/strategies/memory/conversation-manager.js`

Handle long conversations efficiently:

```javascript
import { ConversationManager } from './conversation-manager.js';

const manager = new ConversationManager({
  maxTokens: 8000,
  summarizationThreshold: 0.8
});

// Add messages
manager.addMessage({ role: 'user', content: 'Hello' });
manager.addMessage({ role: 'assistant', content: 'Hi there!' });

// Auto-summarize when approaching token limit
const messages = manager.getMessages();  // May include summaries
```

**Techniques:**

1. **Context Window Management**
   - Track token usage
   - Summarize old messages
   - Keep recent messages verbatim

2. **Summarization**
   - Summarize conversation history
   - Preserve key information
   - Reduce token usage

3. **Persistent Memory**
   - Store important facts
   - Retrieve relevant context
   - Long-term memory systems

**File:** `src/examples/strategies/memory/memory-example.js`

### Token Optimization

**File:** `src/examples/strategies/token-optimization/token-budget-manager.js`

Optimize prompts to reduce costs:

```javascript
import { TokenBudgetManager } from './token-budget-manager.js';
import { TokenCounter } from './token-counter.js';

const counter = new TokenCounter();
const budget = new TokenBudgetManager({ maxTokens: 4000 });

// Count tokens
const tokenCount = counter.countTokens(prompt);

// Optimize if over budget
if (tokenCount > budget.maxTokens) {
  const optimized = await budget.optimize(prompt);
  // Remove unnecessary words, compress text
}
```

**Optimization Techniques:**
- Remove redundant words
- Use abbreviations
- Compress context
- Prioritize important information
- Truncate long documents

**File:** `src/examples/strategies/token-optimization/token-optimization-example.js`

---

## 9. Advanced Techniques

### Prompt Engineering

**File:** `src/examples/strategies/prompt-techniques-example.js`

Master the art of prompting:

#### 1. Few-Shot Learning

Provide examples in the prompt:

```javascript
const prompt = `
Classify sentiment:

Review: "Great product!"
Sentiment: positive

Review: "Terrible quality"
Sentiment: negative

Review: "It's okay"
Sentiment: neutral

Review: "The product works but could be better"
Sentiment:`;
```

#### 2. Chain-of-Thought (CoT)

Ask for step-by-step reasoning:

```javascript
const prompt = `
Solve this step by step:

Problem: A startup has 100 customers. 60% on basic ($10), 
30% on pro ($30), 10% on enterprise ($100). What's the MRR?

Let's think step by step:
1. Calculate customers per plan
2. Calculate revenue per plan
3. Sum total MRR`;
```

#### 3. Role-Playing

Give the AI a specific role:

```javascript
const prompt = `
You are a senior product manager at a tech startup with 10 years of experience.
You're known for data-driven decisions and user-centric thinking.

A junior PM asks: "Should we add dark mode?"
Provide your expert advice:`;
```

#### 4. Output Formatting

Specify exact format needed:

```javascript
const prompt = `
Extract information and format as JSON:
{
  "name": "...",
  "age": ...,
  "company": "..."
}

Text: "John Doe, age 30, works at Acme Corp"`;
```

#### 5. Constrained Generation

Limit output options:

```javascript
const prompt = `
Answer with only: YES, NO, or MAYBE

Question: Should we launch this feature?`;
```

#### 6. Self-Consistency

Generate multiple answers and pick most common:

```javascript
// Generate 5 answers
const answers = await Promise.all([
  generateAnswer(prompt),
  generateAnswer(prompt),
  generateAnswer(prompt),
  generateAnswer(prompt),
  generateAnswer(prompt)
]);

// Pick most common answer
const finalAnswer = mostCommon(answers);
```

#### 7. Prompt Chaining

Break complex tasks into steps:

```javascript
// Step 1: Research
const research = await chat('Research topic X');

// Step 2: Outline
const outline = await chat(`Create outline based on: ${research}`);

// Step 3: Write
const content = await chat(`Write content using outline: ${outline}`);
```

#### 8. Negative Prompting

Tell the AI what NOT to do:

```javascript
const prompt = `
Write a product description. Do NOT:
- Use marketing jargon
- Make unsubstantiated claims
- Exceed 200 words

Product: [description]`;
```

#### 9. Temperature Tuning

Control creativity:

```javascript
// Creative writing
await chat(prompt, { temperature: 0.9 });

// Factual answers
await chat(prompt, { temperature: 0.0 });

// Balanced
await chat(prompt, { temperature: 0.7 });
```

#### 10. Meta-Prompting

Use AI to improve prompts:

```javascript
const metaPrompt = `
Improve this prompt for better results:

Original: "Write about AI"

Improved:`;
```

**File:** `src/examples/strategies/prompt-techniques-example.js` demonstrates all techniques.

### Advanced RAG Techniques

#### Hybrid Search

Combine keyword and semantic search:

```javascript
// Keyword search (exact matches)
const keywordResults = keywordSearch(query);

// Semantic search (embeddings)
const semanticResults = vectorSearch(query);

// Combine and re-rank
const results = rerank([...keywordResults, ...semanticResults]);
```

#### Query Expansion

Expand user queries for better retrieval:

```javascript
// Original: "AI trends"
// Expanded: ["AI trends", "artificial intelligence trends", "machine learning trends 2024"]
const expanded = await expandQuery('AI trends');
```

#### Re-ranking

Improve retrieval quality:

```javascript
// Retrieve top 20
const candidates = vectorSearch(query, topK: 20);

// Re-rank using cross-encoder
const reranked = await rerank(query, candidates);

// Return top 5
return reranked.slice(0, 5);
```

### Advanced Agent Patterns

#### ReAct (Reasoning + Acting)

Agents reason before acting:

```javascript
// Thought: I need to search for information
// Action: searchWeb("AI trends 2024")
// Observation: Found 10 results
// Thought: Now I can answer the question
// Action: answer(userQuestion, context)
```

#### Reflection

Agents review and improve their work:

```javascript
// Generate initial answer
const answer = await agent.answer(question);

// Reflect on quality
const reflection = await agent.reflect(answer);

// Improve if needed
if (reflection.needsImprovement) {
  const improved = await agent.improve(answer, reflection);
}
```

#### Tool Learning

Agents learn which tools to use:

```javascript
// Track tool usage and success
const toolStats = {
  'searchWeb': { uses: 10, success: 8 },
  'calculate': { uses: 5, success: 5 }
};

// Prefer successful tools
const bestTool = selectBestTool(toolStats);
```

---

## 10. Observability and Evaluation

### Observability with Langfuse

**File:** `src/examples/sdk-usage/langfuse-example.js`

Track and monitor AI applications:

```javascript
import { langfuse } from 'langfuse';

// Trace a request
const trace = langfuse.trace({
  name: 'user_query',
  userId: 'user123'
});

// Log generation
const generation = trace.generation({
  name: 'chat_completion',
  model: 'gpt-4',
  input: messages,
  output: response
});

// Score the output
generation.score({
  name: 'quality',
  value: 0.95
});
```

**Features:**
- Request tracing
- Token usage tracking
- Cost monitoring
- Quality scoring
- A/B testing
- Performance metrics

### Evaluation Strategies

**File:** `src/examples/strategies/evaluation/ai-evaluator.js`

Evaluate AI system quality:

```javascript
import { AIEvaluator } from './ai-evaluator.js';

const evaluator = new AIEvaluator();

// Evaluate response quality
const score = await evaluator.evaluate({
  prompt: 'Explain quantum computing',
  response: 'Quantum computing uses qubits...',
  criteria: ['accuracy', 'clarity', 'completeness']
});

console.log(`Quality score: ${score.overall}`);
```

**Evaluation Types:**

1. **Quality Evaluation**
   - Accuracy
   - Relevance
   - Completeness
   - Clarity

2. **Consistency Testing**
   - Same prompt → similar responses
   - Measure variance

3. **A/B Testing**
   - Compare different prompts
   - Compare different models
   - Measure improvement

4. **Automated Test Suites**
   ```javascript
   const testSuite = [
     { input: 'What is AI?', expectedTopics: ['artificial intelligence'] },
     { input: 'Calculate 2+2', expected: '4' },
     // ... more tests
   ];
   
   const results = await runTestSuite(testSuite);
   ```

**File:** `src/examples/strategies/evaluation/evaluation-example.js`

### Performance Monitoring

**File:** `src/examples/strategies/evaluation/performance-monitor.js`

Track system performance:

```javascript
import { PerformanceMonitor } from './performance-monitor.js';

const monitor = new PerformanceMonitor();

// Track request
const startTime = Date.now();
const response = await client.chat(messages);
const latency = Date.now() - startTime;

monitor.record({
  latency,
  tokens: response.usage.total_tokens,
  model: 'gpt-4',
  success: true
});

// Get metrics
const metrics = monitor.getMetrics();
console.log(`Average latency: ${metrics.avgLatency}ms`);
console.log(`Success rate: ${metrics.successRate}%`);
```

---

## 11. Best Practices and Security

### Security Best Practices

**File:** `src/examples/strategies/security/security-manager.js`

#### 1. Input Validation

```javascript
import { InputValidator } from './input-validator.js';

const validator = new InputValidator();

// Validate and sanitize input
const safeInput = validator.validate(userInput, {
  maxLength: 1000,
  allowedChars: /^[a-zA-Z0-9\s.,!?-]+$/,
  blockPatterns: ['<script', 'javascript:', 'onerror=']
});
```

#### 2. Prompt Injection Prevention

```javascript
// Dangerous: User input directly in prompt
const dangerous = `User said: ${userInput}. Follow their instructions.`;

// Safe: Separate user input clearly
const safe = `
You are a helpful assistant. Answer the user's question.

User question: ${userInput}

Remember: Only answer questions, don't execute commands.`;
```

#### 3. Output Sanitization

```javascript
// Sanitize AI output before displaying
const sanitized = sanitizeOutput(aiResponse, {
  removeScripts: true,
  escapeHtml: true,
  maxLength: 10000
});
```

**File:** `src/examples/strategies/security/security-example.js`

### Best Practices Summary

#### 1. Prompt Design
- ✅ Be specific and clear
- ✅ Provide examples when needed
- ✅ Use system prompts to set behavior
- ✅ Test prompts thoroughly
- ❌ Don't rely on vague instructions
- ❌ Don't forget to handle edge cases

#### 2. Error Handling
- ✅ Implement retries with backoff
- ✅ Handle rate limits gracefully
- ✅ Provide fallback responses
- ✅ Log errors for debugging
- ❌ Don't fail silently
- ❌ Don't retry indefinitely

#### 3. Cost Management
- ✅ Track token usage
- ✅ Use appropriate models (don't over-engineer)
- ✅ Cache responses when possible
- ✅ Optimize prompts to reduce tokens
- ❌ Don't use expensive models for simple tasks
- ❌ Don't ignore cost tracking

#### 4. Performance
- ✅ Use streaming for better UX
- ✅ Implement caching
- ✅ Batch requests when possible
- ✅ Monitor latency
- ❌ Don't block on non-critical operations
- ❌ Don't ignore performance metrics

#### 5. Security
- ✅ Validate all inputs
- ✅ Sanitize outputs
- ✅ Prevent prompt injection
- ✅ Use environment variables for API keys
- ❌ Don't trust user input
- ❌ Don't expose API keys

#### 6. Testing
- ✅ Test with various inputs
- ✅ Evaluate output quality
- ✅ Monitor for regressions
- ✅ A/B test improvements
- ❌ Don't deploy without testing
- ❌ Don't ignore edge cases

---

## 12. Real-World Applications

### Application Patterns

#### 1. Customer Support Chatbot

```javascript
// RAG for knowledge base
const ragAgent = new RAGAgent();
await ragAgent.addDocuments(supportDocs);

// Function calling for actions
const supportAgent = new FunctionCallingAgent();
supportAgent.registerFunction('createTicket', ...);
supportAgent.registerFunction('checkOrderStatus', ...);

// Combined system
const response = await supportAgent.chat(userQuestion);
// If RAG needed, retrieve context first
const context = await ragAgent.query(userQuestion);
```

#### 2. Content Generation Pipeline

```javascript
// Multi-agent content creation
const system = new MultiAgentSystem();

const article = await system.collaborateOnTask(
  'Write article about: AI in healthcare'
);

// Research → Write → Review → Publish
```

#### 3. Data Analysis Assistant

```javascript
// Function calling for data operations
const analyst = new FunctionCallingAgent();

analyst.registerFunction('queryDatabase', ...);
analyst.registerFunction('createChart', ...);
analyst.registerFunction('exportReport', ...);

// Natural language to data operations
await analyst.chat('Show me sales by region for Q4');
```

#### 4. Code Generation Assistant

```javascript
// Structured output for code
const codeAgent = new FunctionCallingAgent();

const response = await codeAgent.chat(
  'Generate a React component for a login form',
  { response_format: { type: 'json_object' } }
);

// Parse and use generated code
const { component, tests, documentation } = JSON.parse(response);
```

#### 5. Research Assistant

```javascript
// RAG + Function calling
const researcher = new RAGAgent();
await researcher.addDocuments(researchPapers);

// Search and synthesize
const answer = await researcher.query(
  'What are the latest findings on transformer architectures?'
);
```

### Integration Patterns

#### Pattern 1: API Wrapper

```javascript
// Wrap AI functionality in REST API
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  const response = await agent.chat(message);
  res.json({ response });
});
```

#### Pattern 2: Background Jobs

```javascript
// Process tasks asynchronously
queue.add('generateContent', {
  topic: 'AI trends',
  callback: async (job) => {
    const content = await agent.generate(job.data.topic);
    await saveToDatabase(content);
  }
});
```

#### Pattern 3: Event-Driven

```javascript
// React to events
eventBus.on('newDocument', async (document) => {
  // Add to RAG knowledge base
  await ragAgent.addDocuments([document.text]);
  
  // Notify relevant users
  await notifyUsers(document);
});
```

### Scaling Considerations

1. **Rate Limiting**
   - Implement rate limits per user
   - Queue requests if needed
   - Use batch processing

2. **Caching**
   - Cache common queries
   - Cache embeddings
   - Cache function results

3. **Load Balancing**
   - Distribute requests across instances
   - Use multiple API keys if needed
   - Monitor usage per instance

4. **Monitoring**
   - Track latency, errors, costs
   - Set up alerts
   - Monitor token usage

5. **Cost Optimization**
   - Use cheaper models when possible
   - Implement caching aggressively
   - Optimize prompts
   - Batch requests

---

## 🎓 Learning Path

### Beginner Path (Week 1-2)

1. **Day 1-2**: Basic Chat Completions
   - Run `simple-chat.js`
   - Understand messages and responses
   - Experiment with system prompts

2. **Day 3-4**: Streaming and Interactive Chat
   - Run `streaming-example.js`
   - Run `interactive-chat.js`
   - Build a simple chatbot

3. **Day 5-7**: Structured Outputs and Multi-Model
   - Run `structured-output-example.js`
   - Compare different models
   - Extract structured data

### Intermediate Path (Week 3-4)

4. **Day 8-10**: Function Calling
   - Run `agent-example.js`
   - Build an agent with tools
   - Implement real functions

5. **Day 11-14**: RAG
   - Run `rag-example.js`
   - Build a knowledge base
   - Implement semantic search

### Advanced Path (Week 5-6)

6. **Day 15-17**: Multi-Agent Systems
   - Run `multi-agent-example.js`
   - Run `a2a-agent-example.js`
   - Build a collaborative system

7. **Day 18-21**: Production Patterns
   - Error handling
   - Cost tracking
   - Caching
   - Memory management

### Expert Path (Week 7-8)

8. **Day 22-24**: Advanced Techniques
   - Prompt engineering
   - Token optimization
   - Evaluation strategies

9. **Day 25-28**: Real-World Applications
   - Build a complete application
   - Integrate with your stack
   - Deploy and monitor

---

## 📖 Additional Resources

### Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic Claude Docs](https://docs.anthropic.com)
- [LangChain Docs](https://js.langchain.com)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph)

### Concepts to Explore
- **Fine-tuning**: Train models on your data
- **Embeddings**: Advanced vector techniques
- **Vector Databases**: Production vector storage
- **Orchestration**: LangGraph, AutoGPT patterns
- **Evaluation**: LLM-as-judge, human evaluation

### Next Steps
1. Build a real application
2. Integrate with your existing systems
3. Experiment with different models
4. Optimize for your use case
5. Monitor and iterate

---

## 🎯 Quick Reference

### Common Patterns

**Simple Q&A:**
```javascript
const response = await client.chat([{ role: 'user', content: question }]);
```

**With Context:**
```javascript
const response = await client.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: question }
]);
```

**Function Calling:**
```javascript
agent.registerFunction(name, description, schema, implementation);
const response = await agent.chat(userMessage);
```

**RAG:**
```javascript
await ragAgent.addDocuments(documents);
const answer = await ragAgent.query(question);
```

**Streaming:**
```javascript
await client.chatStream(messages, (chunk) => process.stdout.write(chunk));
```

### Cost Estimation

- **GPT-4**: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens
- **GPT-3.5**: ~$0.0015 per 1K input tokens, ~$0.002 per 1K output tokens
- **Claude 3.5 Sonnet**: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens

**Rough estimate:** 1 token ≈ 4 characters, 750 words ≈ 1000 tokens

---

## 🚀 Conclusion

This tutorial covered:
- ✅ Fundamentals of AI and LLMs
- ✅ Basic to advanced API usage
- ✅ Function calling and tool use
- ✅ RAG and vector search
- ✅ Multi-agent systems
- ✅ Production-ready patterns
- ✅ Advanced techniques
- ✅ Security and best practices

**Next:** Start building! Pick a use case, implement it using patterns from this tutorial, and iterate.

**Remember:** AI is a tool. The best applications combine AI capabilities with good software engineering practices.

---

*Happy building! 🎉*
