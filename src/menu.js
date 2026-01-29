import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// MENU DATA STRUCTURE
// =============================================================================
// Categories are displayed in the order they appear here

const categories = [
  {
    id: 'beginner',
    title: '🎓 Beginner Tutorials (Start Here!)',
    description: 'Learn AI basics step by step',
    examples: [
      {
        name: 'Hello AI',
        file: '01-hello-ai.js',
        description: 'Your first AI conversation - the "Hello World" of AI',
      },
      {
        name: 'Chat with Context',
        file: '02-chat-with-context.js',
        description: 'Learn system prompts, conversation history, and temperature',
      },
    ],
  },
  {
    id: 'customer-experience',
    title: '🛍️ Customer Experience',
    description: 'Build AI for customer-facing applications',
    examples: [
      {
        name: 'Customer Support Bot',
        file: 'customer-support-bot.js',
        description: 'Complete support chatbot with product knowledge and order lookup',
      },
      {
        name: 'FAQ Bot',
        file: 'faq-bot.js',
        description: 'Answer questions from your knowledge base',
      },
      {
        name: 'Sentiment Analysis',
        file: 'sentiment-analysis.js',
        description: 'Analyze customer feedback emotions and urgency',
      },
    ],
  },
  {
    id: 'sdk-usage',
    title: '📦 SDK Usage',
    description: 'Direct API usage examples',
    examples: [
      {
        name: 'Simple Chat',
        file: 'simple-chat.js',
        description: 'Basic chat completion with OpenAI or Claude',
      },
      {
        name: 'Interactive Chat',
        file: 'interactive-chat.js',
        description: 'Full conversational interface with back-and-forth interaction',
      },
      {
        name: 'Streaming',
        file: 'streaming-example.js',
        description: 'Real-time token streaming',
      },
      {
        name: 'Structured Output',
        file: 'structured-output-example.js',
        description: 'JSON mode & structured outputs',
      },
      {
        name: 'Multi-Model Comparison',
        file: 'multi-model-example.js',
        description: 'Compare outputs from different models',
      },
      {
        name: 'Assistants API (OpenAI)',
        file: 'assistants-api-example.js',
        description: 'OpenAI persistent AI assistants with thread management',
      },
      {
        name: 'Claude Assistants-like',
        file: 'claude-assistants-example.js',
        description: 'Claude persistent conversations with tool use',
      },
      {
        name: 'Embeddings',
        file: 'embeddings-example.js',
        description: 'Embeddings for similarity, clustering, classification',
      },
      {
        name: 'Vision/Image Analysis',
        file: 'vision-example.js',
        description: 'Image understanding and analysis capabilities',
      },
      {
        name: 'LangGraph',
        file: 'langgraph-example.js',
        description: 'Stateful, multi-actor agent workflows',
      },
      {
        name: 'Langfuse',
        file: 'langfuse-example.js',
        description: 'LLM observability, tracing, and monitoring',
      },
    ],
  },
  {
    id: 'mcps',
    title: '🧩 MCP Examples (Model Context Protocol)',
    description: 'MCP servers and clients for tool integration',
    examples: [
      {
        name: 'Filesystem MCP',
        file: 'demo-filesystem-mcp.js',
        description: 'File operations: read, write, list, search',
        server: { script: 'examples/mcps/filesystem-mcp-server.js', port: 3002 },
      },
      {
        name: 'Fetch MCP',
        file: 'demo-fetch-mcp.js',
        description: 'HTTP fetching and web scraping',
        server: { script: 'examples/mcps/fetch-mcp-server.js', port: 3003 },
      },
      {
        name: 'SQLite MCP',
        file: 'demo-sqlite-mcp.js',
        description: 'Database operations: query, insert, update',
        server: { script: 'examples/mcps/sqlite-mcp-server.js', port: 3004 },
      },
      {
        name: 'Memory MCP',
        file: 'demo-memory-mcp.js',
        description: 'Persistent knowledge storage: entities, facts, notes',
        server: { script: 'examples/mcps/memory-mcp-server.js', port: 3005 },
      },
      {
        name: 'Git MCP',
        file: 'demo-git-mcp.js',
        description: 'Git operations: status, log, diff, branches',
        server: { script: 'examples/mcps/git-mcp-server.js', port: 3006 },
      },
      {
        name: 'Playwright MCP',
        file: 'demo-call-playwright.js',
        description: 'Browser automation and search',
        server: { script: 'examples/mcps/playwright-browser-search-server.js', port: 3001 },
      },
    ],
  },
  {
    id: 'strategies',
    title: '🤖 Agent Patterns',
    description: 'AI agent architectures and patterns',
    examples: [
      {
        name: 'Function Calling Agent',
        file: 'agent-example.js',
        description: 'AI agent that can use tools/functions',
      },
      {
        name: 'ReAct Agent',
        file: 'react-agent/react-agent-example.js',
        description: 'ReAct (Reasoning + Acting) pattern',
      },
      {
        name: 'Planning Agent',
        file: 'planning-agent/planning-agent-example.js',
        description: 'Plan-and-Solve pattern for complex tasks',
      },
      {
        name: 'Self-Reflection Agent',
        file: 'self-reflection/self-reflection-example.js',
        description: 'Agent that critiques and improves its own output',
      },
      {
        name: 'Autonomous Agent',
        file: 'autonomous-agent/autonomous-agent-example.js',
        description: 'Goal-driven autonomous agent with memory',
      },
      {
        name: 'Supervisor Agent',
        file: 'supervisor-agent/supervisor-agent-example.js',
        description: 'Hierarchical multi-agent with supervisor pattern',
      },
      {
        name: 'Agent Orchestration',
        file: 'agent-orchestration/agent-orchestration-example.js',
        description: 'Intelligent tool routing/dispatching pattern',
      },
      {
        name: 'RAG',
        file: 'rag-example.js',
        description: 'Retrieval-Augmented Generation with vector search',
      },
      {
        name: 'Browser Search Agent',
        file: 'browser-search/browser-search-example.js',
        description: 'Web search and page reading with MCP-style tools',
      },
      {
        name: 'Browser Search (Playwright)',
        file: 'browser-search/playwright-browser-search-example.js',
        description: 'Real browser search via Playwright MCP server',
        server: { script: 'examples/mcps/playwright-browser-search-server.js', port: 3001 },
      },
      {
        name: 'Multi-Agent Collaboration',
        file: 'multi-agent/multi-agent-example.js',
        description: 'Multiple AI agents working together',
      },
      {
        name: 'Agent-to-Agent (A2A)',
        file: 'a2a-agent/a2a-agent-example.js',
        description: 'Direct agent-to-agent messaging and negotiation',
      },
      {
        name: 'Agentic Workflows',
        file: 'workflow/workflow-example.js',
        description: 'Multi-step autonomous workflows',
      },
    ],
  },
  {
    id: 'strategies',
    title: '🛡️ Production Patterns',
    description: 'Patterns for production-ready AI applications',
    examples: [
      {
        name: 'Human-in-the-Loop',
        file: 'human-in-loop/human-in-loop-example.js',
        description: 'Human approval and intervention patterns',
      },
      {
        name: 'Guardrails',
        file: 'guardrails/guardrails-example.js',
        description: 'Output validation, PII detection, content filtering',
      },
      {
        name: 'Smart Model Router',
        file: 'model-router/model-router-example.js',
        description: 'Route to models based on task complexity and cost',
      },
      {
        name: 'Error Handling',
        file: 'error-handling/error-handling-example.js',
        description: 'Production-ready error handling with retries',
      },
      {
        name: 'Security',
        file: 'security/security-example.js',
        description: 'Input sanitization and prompt injection prevention',
      },
      {
        name: 'Cost Tracking',
        file: 'cost-tracking/cost-tracking-example.js',
        description: 'Monitor token usage and estimate API costs',
      },
    ],
  },
  {
    id: 'strategies',
    title: '⚡ Optimization',
    description: 'Performance and cost optimization techniques',
    examples: [
      {
        name: 'Response Caching',
        file: 'caching/caching-example.js',
        description: 'Caching strategies to reduce costs and latency',
      },
      {
        name: 'Token Optimization',
        file: 'token-optimization/token-optimization-example.js',
        description: 'Token counting and prompt optimization',
      },
      {
        name: 'Batch Processing',
        file: 'batch/batch-example.js',
        description: 'Efficient parallel and sequential processing',
      },
    ],
  },
  {
    id: 'strategies',
    title: '🧠 Advanced Techniques',
    description: 'Advanced AI development techniques',
    examples: [
      {
        name: 'Memory Management',
        file: 'memory/memory-example.js',
        description: 'Advanced conversation context handling',
      },
      {
        name: 'Context Extraction',
        file: 'context-extraction/context-extraction-example.js',
        description: 'Extract relevant context from chat history',
      },
      {
        name: 'State Persistence',
        file: 'state-persistence/state-persistence-example.js',
        description: 'Checkpointing and state management pattern',
      },
      {
        name: 'Prompt Engineering',
        file: 'prompt-techniques-example.js',
        description: '10+ advanced prompting techniques',
      },
      {
        name: 'Evaluation & Testing',
        file: 'evaluation/evaluation-example.js',
        description: 'Quality evaluation, A/B testing, automated tests',
      },
    ],
  },
];

// =============================================================================
// READLINE INTERFACE
// =============================================================================

function createInterface() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }
  }

  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

function displayMainMenu() {
  if (process.stdout.isTTY) {
    console.clear();
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║            AI Agents Demo - Select a Category               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  categories.forEach((category, index) => {
    const num = index + 1;
    console.log(`  ${num}. ${category.title}`);
    console.log(`     ${category.description} (${category.examples.length} examples)`);
    console.log('');
  });

  console.log(`  ${categories.length + 1}. Exit`);
  console.log('');
  console.log('─'.repeat(60));
}

function displayCategoryMenu(categoryIndex) {
  const category = categories[categoryIndex];

  if (process.stdout.isTTY) {
    console.clear();
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ${category.title.padEnd(56)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  category.examples.forEach((example, index) => {
    const num = index + 1;
    console.log(`  ${num}. ${example.name}`);
    console.log(`     ${example.description}`);
    console.log('');
  });

  console.log(`  ${category.examples.length + 1}. ← Back to Main Menu`);
  console.log('');
  console.log('─'.repeat(60));
}

// =============================================================================
// SERVER MANAGEMENT
// =============================================================================

/**
 * Wait for a server to be ready by polling the health endpoint
 */
async function waitForServer(port, maxAttempts = 30, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

/**
 * Start an MCP server as a background process
 */
function startServer(serverScript, port) {
  const serverPath = join(__dirname, '..', serverScript);

  console.log(`\n🔧 Starting MCP server: ${serverScript}`);
  console.log(`   Port: ${port}`);

  const serverProcess = spawn('node', [serverPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    cwd: process.cwd(),
  });

  // Capture server output for debugging
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('running at')) {
      // Suppress the "running at" message since we show our own
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`   Server error: ${data.toString().trim()}`);
  });

  return serverProcess;
}

/**
 * Stop a server process
 */
function stopServer(serverProcess) {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
}

// =============================================================================
// RUN EXAMPLE
// =============================================================================

async function runExample(categoryId, file, callback, serverConfig = null) {
  const filePath = join(__dirname, 'examples', categoryId, file);
  const isInteractive = file === 'interactive-chat.js';
  let serverProcess = null;

  // Start server if needed
  if (serverConfig) {
    serverProcess = startServer(serverConfig.script, serverConfig.port);

    console.log('   Waiting for server to be ready...');
    const isReady = await waitForServer(serverConfig.port);

    if (!isReady) {
      console.error('\n❌ Server failed to start. Check for errors above.');
      stopServer(serverProcess);
      console.log('\nPress Enter to continue...');
      return false;
    }

    console.log('   ✓ Server is ready\n');
  }

  console.log(`🚀 Running: ${file}\n`);
  console.log('─'.repeat(60));
  console.log('');

  const child = spawn('node', [filePath], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  child.on('close', (code) => {
    // Clean up server
    if (serverProcess) {
      console.log('\n🔧 Stopping MCP server...');
      stopServer(serverProcess);
    }

    console.log('\n');
    console.log('─'.repeat(60));
    if (code === 0) {
      console.log('✅ Example completed successfully');
    } else if (code === null) {
      console.log('⚠️  Example was interrupted');
    } else {
      console.log(`❌ Example exited with code ${code}`);
    }
    console.log('─'.repeat(60));

    if (isInteractive) {
      console.log('\nReturning to menu...\n');
      setTimeout(callback, 1000);
    } else {
      console.log('\nPress Enter to continue...');
    }
  });

  child.on('error', (error) => {
    // Clean up server on error
    if (serverProcess) {
      stopServer(serverProcess);
    }

    console.error(`\n❌ Error running example: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.error(`   File not found: ${filePath}`);
    }
    console.log('\nPress Enter to continue...');
  });

  return isInteractive;
}

// =============================================================================
// MENU NAVIGATION
// =============================================================================

function promptMainMenu(rl) {
  rl.removeAllListeners('line');

  displayMainMenu();

  rl.question(`Select a category (1-${categories.length + 1}): `, (answer) => {
    const choice = parseInt(answer.trim(), 10);

    if (isNaN(choice) || choice < 1 || choice > categories.length + 1) {
      console.log('\n❌ Invalid option.');
      rl.close();
      setTimeout(() => {
        promptMainMenu(createInterface());
      }, 1000);
      return;
    }

    if (choice === categories.length + 1) {
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
    }

    rl.close();
    promptCategoryMenu(createInterface(), choice - 1);
  });
}

function promptCategoryMenu(rl, categoryIndex) {
  rl.removeAllListeners('line');

  const category = categories[categoryIndex];
  displayCategoryMenu(categoryIndex);

  rl.question(`Select an example (1-${category.examples.length + 1}): `, async (answer) => {
    const choice = parseInt(answer.trim(), 10);

    if (isNaN(choice) || choice < 1 || choice > category.examples.length + 1) {
      console.log('\n❌ Invalid option.');
      rl.close();
      setTimeout(() => {
        promptCategoryMenu(createInterface(), categoryIndex);
      }, 1000);
      return;
    }

    // Back to main menu
    if (choice === category.examples.length + 1) {
      rl.close();
      promptMainMenu(createInterface());
      return;
    }

    const example = category.examples[choice - 1];
    rl.close();

    const isInteractive = await runExample(
      category.id,
      example.file,
      () => {
        promptCategoryMenu(createInterface(), categoryIndex);
      },
      example.server || null
    );

    if (!isInteractive) {
      // Wait for Enter to return to category menu
      const waitRl = createInterface();
      waitRl.on('line', () => {
        waitRl.close();
        promptCategoryMenu(createInterface(), categoryIndex);
      });
    }
  });
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  promptMainMenu(createInterface());
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});

main();
