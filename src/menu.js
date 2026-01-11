import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const examples = {
  'sdk-usage': {
    title: '📦 Direct SDK Usage Examples',
    examples: [
      // Basic SDK Features
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
      { name: 'Streaming', file: 'streaming-example.js', description: 'Real-time token streaming' },
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
      // Advanced SDK Features
      {
        name: 'Assistants API (OpenAI)',
        file: 'assistants-api-example.js',
        description: 'OpenAI persistent AI assistants with thread management',
      },
      {
        name: 'Claude Assistants-like',
        file: 'claude-assistants-example.js',
        description: 'Claude persistent conversations with tool use (Messages API)',
      },
      {
        name: 'Embeddings',
        file: 'embeddings-example.js',
        description: 'Standalone embeddings for similarity, clustering, classification',
      },
      {
        name: 'Vision/Image Analysis',
        file: 'vision-example.js',
        description: 'Image understanding and analysis capabilities',
      },
      {
        name: 'Unified Client Interface',
        file: 'unified-client-example.js',
        description: 'Unified interface for OpenAI and Claude clients',
      },
      // Third-Party SDKs
      {
        name: 'LangGraph',
        file: 'langgraph-example.js',
        description: 'Stateful, multi-actor agent workflows with LangGraph SDK',
      },
      {
        name: 'Langfuse',
        file: 'langfuse-example.js',
        description: 'LLM observability, tracing, and monitoring with Langfuse SDK',
      },
    ],
  },
  strategies: {
    title: '🎯 Higher-Level Strategy Examples',
    examples: [
      // Agent Patterns
      {
        name: 'Function Calling Agent',
        file: 'agent-example.js',
        description: 'AI agent that can use tools/functions',
      },
      {
        name: 'ReAct Agent',
        file: 'react-agent/react-agent-example.js',
        description: 'ReAct (Reasoning + Acting) pattern from galactiq',
      },
      {
        name: 'Agent Orchestration',
        file: 'agent-orchestration/agent-orchestration-example.js',
        description: 'Intelligent tool routing/dispatching pattern from galactiq',
      },
      {
        name: 'RAG',
        file: 'rag-example.js',
        description: 'Retrieval-Augmented Generation with vector search',
      },
      {
        name: 'Multi-Agent Collaboration',
        file: 'multi-agent/multi-agent-example.js',
        description: 'Multiple AI agents working together',
      },
      {
        name: 'Agent-to-Agent (A2A) Communication',
        file: 'a2a-agent/a2a-agent-example.js',
        description: 'Direct agent-to-agent messaging and negotiation',
      },
      {
        name: 'Agentic Workflows',
        file: 'workflow/workflow-example.js',
        description: 'Multi-step autonomous workflows',
      },
      // Production Infrastructure
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
      // Optimization Techniques
      {
        name: 'Response Caching',
        file: 'caching/caching-example.js',
        description: 'Caching strategies to reduce costs and improve latency',
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
      // Advanced Techniques
      {
        name: 'Memory Management',
        file: 'memory/memory-example.js',
        description: 'Advanced conversation context handling',
      },
      {
        name: 'Context Extraction',
        file: 'context-extraction/context-extraction-example.js',
        description: 'Extract relevant context from chat history (galactiq pattern)',
      },
      {
        name: 'State Persistence',
        file: 'state-persistence/state-persistence-example.js',
        description: 'Checkpointing and state management pattern from galactiq',
      },
      {
        name: 'Prompt Engineering',
        file: 'prompt-techniques-example.js',
        description: '10+ advanced prompting techniques',
      },
      {
        name: 'Evaluation & Testing',
        file: 'evaluation/evaluation-example.js',
        description: 'Quality evaluation, A/B testing, and automated test suites',
      },
    ],
  },
};

function createInterface() {
  // Ensure stdin is in the right state
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

function displayMenu() {
  // Only clear screen if not in CI/test environment
  if (process.stdout.isTTY) {
    console.clear();
  }
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          AI Agents Demo - Example Selector                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  let optionNumber = 1;
  const optionMap = new Map();

  // SDK Usage Examples
  console.log(`\n${examples['sdk-usage'].title}`);
  console.log('─'.repeat(60));
  examples['sdk-usage'].examples.forEach((example) => {
    console.log(`  ${optionNumber}. ${example.name}`);
    console.log(`     ${example.description}`);
    optionMap.set(optionNumber, { category: 'sdk-usage', file: example.file });
    optionNumber++;
  });

  // Strategy Examples
  console.log(`\n${examples['strategies'].title}`);
  console.log('─'.repeat(60));
  examples['strategies'].examples.forEach((example) => {
    console.log(`  ${optionNumber}. ${example.name}`);
    console.log(`     ${example.description}`);
    optionMap.set(optionNumber, { category: 'strategies', file: example.file });
    optionNumber++;
  });

  console.log(`\n  ${optionNumber}. Exit`);
  console.log('');
  console.log('─'.repeat(60));

  return { optionMap, maxOption: optionNumber };
}

function runExample(category, file, menuRl) {
  const filePath = join(__dirname, 'examples', category, file);
  const isInteractive = file === 'interactive-chat.js';

  // For interactive examples, close the menu's readline to prevent conflicts
  if (isInteractive && menuRl) {
    menuRl.pause();
    menuRl.close();
  }

  console.log(`\n🚀 Running: ${file}\n`);
  console.log('─'.repeat(60));
  console.log('');

  const child = spawn('node', [filePath], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  child.on('close', (code) => {
    console.log('\n');
    console.log('─'.repeat(60));
    if (code === 0) {
      console.log('✅ Example completed successfully');
    } else if (code === null) {
      // Process was terminated (e.g., Ctrl+C)
      console.log('⚠️  Example was interrupted');
    } else {
      console.log(`❌ Example exited with code ${code}`);
    }
    console.log('─'.repeat(60));

    // For interactive examples, don't wait for Enter - just return to menu
    if (isInteractive) {
      console.log('\nReturning to menu...\n');
      setTimeout(() => {
        const { optionMap: newMap, maxOption: newMax } = displayMenu();
        const newRl = createInterface();
        promptUser(newRl, newMap, newMax);
      }, 1000);
    } else {
      console.log('\nPress Enter to return to menu...');
    }
  });

  child.on('error', (error) => {
    console.error(`\n❌ Error running example: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.error(`   File not found: ${filePath}`);
    }

    // Recreate menu interface if it was closed
    if (isInteractive) {
      setTimeout(() => {
        const { optionMap: newMap, maxOption: newMax } = displayMenu();
        const newRl = createInterface();
        promptUser(newRl, newMap, newMax);
      }, 1000);
    } else {
      console.log('\nPress Enter to return to menu...');
    }
  });
}

function promptUser(rl, optionMap, maxOption) {
  // Remove any existing listeners to prevent duplicates
  rl.removeAllListeners('line');

  rl.question(`\nSelect an example (1-${maxOption}): `, (answer) => {
    const trimmed = answer.trim();

    // Handle empty input
    if (!trimmed) {
      console.log('\n❌ Please enter a number.');
      rl.close();
      setTimeout(() => {
        const { optionMap: newMap, maxOption: newMax } = displayMenu();
        promptUser(createInterface(), newMap, newMax);
      }, 1500);
      return;
    }

    const choice = parseInt(trimmed, 10);

    if (isNaN(choice)) {
      console.log('\n❌ Invalid input. Please enter a number.');
      rl.close();
      setTimeout(() => {
        const { optionMap: newMap, maxOption: newMax } = displayMenu();
        promptUser(createInterface(), newMap, newMax);
      }, 1500);
      return;
    }

    if (choice === maxOption) {
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
    }

    if (choice < 1 || choice > maxOption - 1) {
      console.log(`\n❌ Invalid option. Please select a number between 1 and ${maxOption - 1}.`);
      rl.close();
      setTimeout(() => {
        const { optionMap: newMap, maxOption: newMax } = displayMenu();
        promptUser(createInterface(), newMap, newMax);
      }, 1500);
      return;
    }

    const selected = optionMap.get(choice);
    if (selected) {
      const isInteractive = selected.file === 'interactive-chat.js';

      if (isInteractive) {
        // For interactive chat, close menu readline and let child process take control
        rl.close();
        runExample(selected.category, selected.file, null);
      } else {
        // For non-interactive examples, close and wait
        rl.close();
        runExample(selected.category, selected.file, null);

        // Wait for user to press Enter before showing menu again
        const waitRl = createInterface();
        waitRl.on('line', () => {
          waitRl.close();
          const { optionMap: newMap, maxOption: newMax } = displayMenu();
          promptUser(createInterface(), newMap, newMax);
        });
      }
    } else {
      console.log('\n❌ Option not found.');
      rl.close();
      setTimeout(() => {
        const { optionMap: newMap, maxOption: newMax } = displayMenu();
        promptUser(createInterface(), newMap, newMax);
      }, 1500);
    }
  });
}

function main() {
  const rl = createInterface();
  const { optionMap, maxOption } = displayMenu();
  promptUser(rl, optionMap, maxOption);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});

main();
