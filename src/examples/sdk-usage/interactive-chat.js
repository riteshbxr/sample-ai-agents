import { createAIClient } from '../../clients/client-factory.js';
import { RAGAgent } from '../../agents/rag-agent.js';
import readline from 'readline';
import { cosineSimilarity } from '../../utils/similarity-utils.js';
import { estimateTokens } from '../../utils/token-utils.js';
import { calculateCost } from '../../utils/cost-utils.js';
import { config } from '../../config.js';

/**
 * Interactive Chat Example with Tool Support
 * Demonstrates a full conversational interface with back-and-forth interaction
 * Includes all examples as tools that the AI can use
 */
class InteractiveChat {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.messages = [];
    this.functions = new Map();
    this.functionDefinitions = [];
    this.ragAgent = null; // Lazy initialize if needed

    // Create readline interface with proper configuration
    // terminal: true allows readline to control the terminal properly
    // This prevents double echoing by letting readline handle all terminal I/O
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 0, // Disable history to prevent issues
    });

    // Register all available tools
    this.registerAllTools();
  }

  /**
   * Register all available tools/examples
   */
  registerAllTools() {
    // RAG Tool - Search documents
    this.registerTool(
      'search_documents',
      'Search through documents using RAG (Retrieval-Augmented Generation). Use this when the user asks about specific information that might be in documents.',
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query or question to find relevant information',
          },
        },
        required: ['query'],
      },
      async ({ query }) => {
        try {
          if (!this.ragAgent) {
            this.ragAgent = new RAGAgent();
            // You can pre-load documents here if needed
          }
          const result = await this.ragAgent.query(query);
          return { result, success: true };
        } catch (error) {
          return { error: error.message, success: false };
        }
      }
    );

    // Embeddings Tool - Semantic similarity
    this.registerTool(
      'calculate_similarity',
      'Calculate semantic similarity between two texts using embeddings. Use this to compare texts or find similar content.',
      {
        type: 'object',
        properties: {
          text1: { type: 'string', description: 'First text to compare' },
          text2: { type: 'string', description: 'Second text to compare' },
        },
        required: ['text1', 'text2'],
      },
      async ({ text1, text2 }) => {
        try {
          const embeddings = await this.client.getEmbeddings([text1, text2]);
          const similarity = cosineSimilarity(embeddings[0], embeddings[1]);
          return { similarity: similarity.toFixed(4), success: true };
        } catch (error) {
          return { error: error.message, success: false };
        }
      }
    );

    // Structured Output Tool
    this.registerTool(
      'extract_structured_data',
      'Extract structured data from unstructured text. Use this when the user wants to parse or extract specific information in a structured format.',
      {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to extract data from' },
          schema: { type: 'string', description: 'Description of what data to extract' },
        },
        required: ['text', 'schema'],
      },
      async ({ text, schema }) => {
        try {
          const response = await this.client.chat(
            [
              {
                role: 'system',
                content: `Extract structured data from the text. Return as valid JSON. ${schema}`,
              },
              {
                role: 'user',
                content: text,
              },
            ],
            {
              response_format: { type: 'json_object' },
              temperature: 0,
            }
          );
          const data = JSON.parse(this.client.getTextContent(response));
          return { data, success: true };
        } catch (error) {
          return { error: error.message, success: false };
        }
      }
    );

    // Multi-Model Comparison Tool
    this.registerTool(
      'compare_models',
      'Compare responses from different AI models. Use this when the user wants to see how different models respond to the same query.',
      {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query to compare across models' },
        },
        required: ['query'],
      },
      async ({ query }) => {
        try {
          const openaiClient = createAIClient('openai');
          const responses = {};

          if (config.openai.apiKey) {
            const openaiResp = await openaiClient.chat([{ role: 'user', content: query }]);
            responses.openai = openaiResp.choices[0].message.content.substring(0, 200);
          }

          if (config.claude.apiKey) {
            const claudeClient = createAIClient('claude');
            const claudeResp = await claudeClient.chat([{ role: 'user', content: query }]);
            responses.claude = claudeClient.getTextContent(claudeResp).substring(0, 200);
          }

          return { responses, success: true };
        } catch (error) {
          return { error: error.message, success: false };
        }
      }
    );

    // Token Counting Tool
    this.registerTool(
      'count_tokens',
      'Count tokens in text. Use this to estimate token usage or check if text fits within context limits.',
      {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to count tokens for' },
        },
        required: ['text'],
      },
      async ({ text }) => {
        const estimated = estimateTokens(text);
        return { estimated_tokens: estimated, text_length: text.length, success: true };
      }
    );

    // Cost Estimation Tool
    this.registerTool(
      'estimate_cost',
      'Estimate the cost of an API call based on token count. Use this when the user asks about pricing or costs.',
      {
        type: 'object',
        properties: {
          prompt_tokens: { type: 'number', description: 'Number of prompt tokens' },
          completion_tokens: { type: 'number', description: 'Number of completion tokens' },
          model: { type: 'string', description: 'Model name (e.g., gpt-4, gpt-3.5-turbo)' },
        },
        required: ['prompt_tokens', 'completion_tokens', 'model'],
      },
      async ({ prompt_tokens, completion_tokens, model }) => {
        const cost = calculateCost(prompt_tokens, completion_tokens, model);
        return {
          cost_usd: cost.totalCostUSD,
          prompt_tokens: cost.promptTokens,
          completion_tokens: cost.completionTokens,
          total_tokens: cost.totalTokens,
          model: cost.model,
          success: true,
        };
      }
    );
  }

  /**
   * Register a tool/function
   */
  registerTool(name, description, parameters, implementation) {
    this.functions.set(name, implementation);

    if (this.provider === 'openai') {
      this.functionDefinitions.push({
        name,
        description,
        parameters,
      });
    } else if (this.provider === 'claude') {
      this.functionDefinitions.push({
        name,
        description,
        input_schema: parameters,
      });
    }
  }

  /**
   * Execute a function call
   */
  async executeFunction(name, args) {
    const func = this.functions.get(name);
    if (!func) {
      return { error: `Function ${name} not found`, success: false };
    }

    try {
      const result = await func(args);
      return result;
    } catch (error) {
      return { error: error.message, success: false };
    }
  }

  /**
   * Initialize the chat with a system message
   */
  initialize(systemMessage = null) {
    const defaultMessage = `You are a helpful AI assistant with access to various tools and capabilities:
- Search documents using RAG
- Calculate semantic similarity between texts
- Extract structured data from text
- Compare different AI models
- Count tokens and estimate costs
- And more!

Use these tools when appropriate to help the user. Always explain what you're doing when using tools.`;

    this.messages.push({
      role: 'system',
      content: systemMessage || defaultMessage,
    });
  }

  /**
   * Get user input - fixed to prevent double echoing
   */
  async getUserInput() {
    return new Promise((resolve) => {
      // Resume stdin for readline to work (if it was paused)
      if (process.stdin.isTTY && process.stdin.isPaused()) {
        process.stdin.resume();
      }

      // Use question method - readline handles input properly
      this.rl.question('\n👤 You: ', (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Send message to AI with function calling support and streaming response
   */
  async sendMessage(userMessage) {
    if (!userMessage) {
      return null;
    }

    // Add user message to conversation history
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      let fullResponse = '';
      let needsFunctionCall = true;
      let maxIterations = 5; // Prevent infinite loops
      let iteration = 0;

      while (needsFunctionCall && iteration < maxIterations) {
        iteration++;

        if (iteration > 1) {
          console.log('\n🤖 Processing...\n');
        } else {
          console.log('\n🤖 Assistant:');
          console.log('─'.repeat(60));
        }

        // Use function calling if we have tools registered
        if (this.functionDefinitions.length > 0) {
          const response = await this.client.chatWithTools(
            this.messages,
            this.functionDefinitions,
            {
              temperature: 0.7,
            }
          );

          // Handle tool use using interface methods
          if (this.client.hasToolUse(response)) {
            const toolUseBlocks = this.client.getToolUseBlocks(response);

            // Add assistant message to conversation
            if (this.provider === 'openai') {
              const message = response.choices?.[0]?.message || {
                role: 'assistant',
                content: this.client.getTextContent(response),
              };
              this.messages.push(message);
            } else {
              this.messages.push({
                role: 'assistant',
                content: response.content,
              });
            }

            // Execute all tool calls
            const toolResults = [];
            for (const toolCall of toolUseBlocks) {
              let functionName, functionArgs;

              // Handle OpenAI format (tool_calls)
              if (toolCall.function) {
                functionName = toolCall.function.name;
                functionArgs = JSON.parse(toolCall.function.arguments);
              }
              // Handle Claude format (tool_use)
              else {
                functionName = toolCall.name;
                functionArgs = toolCall.input;
              }

              console.log(`\n🔧 Using tool: ${functionName}`);
              const result = await this.executeFunction(functionName, functionArgs);

              // Format tool result based on provider
              if (this.provider === 'openai') {
                toolResults.push({
                  tool_call_id: toolCall.id,
                  role: 'tool',
                  name: functionName,
                  content: JSON.stringify(result),
                });
              } else {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolCall.id,
                  content: JSON.stringify(result),
                });
              }
            }

            // Add tool results to conversation
            if (this.provider === 'openai') {
              this.messages.push(...toolResults);
            } else {
              this.messages.push({
                role: 'user',
                content: toolResults,
              });
            }

            needsFunctionCall = true; // Continue to get final response
            continue;
          } else {
            // No function calls, get text content
            fullResponse = this.client.getTextContent(response);
            needsFunctionCall = false;

            // Add assistant message to conversation
            if (this.provider === 'openai') {
              const message = response.choices?.[0]?.message || {
                role: 'assistant',
                content: fullResponse,
              };
              this.messages.push(message);
            } else {
              this.messages.push({
                role: 'assistant',
                content: response.content,
              });
            }

            if (fullResponse) {
              process.stdout.write(fullResponse);
              console.log('\n');
            }
          }
        } else {
          // No function calling or Claude - just stream
          needsFunctionCall = false;

          if (this.provider === 'openai') {
            fullResponse = await this.client.chatStream(this.messages, (chunk) => {
              process.stdout.write(chunk);
              fullResponse += chunk;
            });
          } else {
            // Claude streaming
            fullResponse = await this.client.chatStream(this.messages, (chunk) => {
              process.stdout.write(chunk);
              fullResponse += chunk;
            });
          }
          console.log('\n');
        }
      }

      console.log('─'.repeat(60));

      // Add final assistant response to conversation history
      if (fullResponse) {
        // Find the last assistant message and update it, or add new one
        const lastAssistant = this.messages.filter((m) => m.role === 'assistant').pop();
        if (lastAssistant && !lastAssistant.tool_calls) {
          lastAssistant.content = fullResponse;
        } else {
          this.messages.push({
            role: 'assistant',
            content: fullResponse,
          });
        }
      }

      return fullResponse;
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Show conversation statistics
   */
  showStats() {
    const userMessages = this.messages.filter((m) => m.role === 'user').length;
    const assistantMessages = this.messages.filter((m) => m.role === 'assistant').length;

    console.log('\n📊 Conversation Statistics:');
    console.log(`   Total messages: ${this.messages.length - 1}`); // -1 for system message
    console.log(`   Your messages: ${userMessages}`);
    console.log(`   Assistant messages: ${assistantMessages}`);
  }

  /**
   * Clear conversation history (keep system message)
   */
  clearHistory() {
    const systemMessage = this.messages.find((m) => m.role === 'system');
    this.messages = systemMessage ? [systemMessage] : [];
    console.log('\n✅ Conversation history cleared');
  }

  /**
   * Show help
   */
  showHelp() {
    console.log('\n📖 Available Commands:');
    console.log('   /help     - Show this help message');
    console.log('   /clear    - Clear conversation history');
    console.log('   /stats    - Show conversation statistics');
    console.log('   /tools    - List available tools');
    console.log('   /exit     - Exit the chat');
    console.log('   /quit     - Exit the chat');
  }

  /**
   * Show available tools
   */
  showTools() {
    console.log('\n🔧 Available Tools:');
    console.log('─'.repeat(60));
    this.functionDefinitions.forEach((tool, idx) => {
      console.log(`\n${idx + 1}. ${tool.name}`);
      console.log(`   ${tool.description}`);
    });
    console.log('\n💡 The AI will automatically use these tools when appropriate.');
    console.log('💡 You can ask things like:');
    console.log('   - "Search for information about X"');
    console.log('   - "Compare these two texts: ..."');
    console.log('   - "Extract data from this text: ..."');
    console.log('   - "How much would this cost?"');
  }

  /**
   * Handle special commands
   */
  handleCommand(input) {
    const command = input.toLowerCase();

    switch (command) {
      case '/help':
        this.showHelp();
        return true;
      case '/clear':
        this.clearHistory();
        return true;
      case '/stats':
        this.showStats();
        return true;
      case '/tools':
        this.showTools();
        return true;
      case '/exit':
      case '/quit':
        return 'exit';
      default:
        return false;
    }
  }

  /**
   * Start the interactive chat session
   */
  async start() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              Interactive AI Chat Interface                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\nProvider: ${this.provider === 'openai' ? 'OpenAI' : 'Claude'}`);
    console.log(`Available Tools: ${this.functionDefinitions.length}`);
    console.log('\n💡 Type your messages to chat with the AI.');
    console.log('💡 The AI can use tools like RAG, embeddings, and more!');
    console.log('💡 Type /help for available commands.');
    console.log('💡 Type /tools to see all available tools.');
    console.log('💡 Type /exit or /quit to end the conversation.\n');
    console.log('─'.repeat(60));

    // Check API key availability
    if (this.provider === 'openai') {
      if (!config.openai.apiKey) {
        console.log(
          '\n⚠️  OpenAI API key not found. Please set AZURE_OPENAI_API_KEY or OPENAI_API_KEY in your .env file.'
        );
        this.rl.close();
        return;
      }
    } else {
      if (!config.claude.apiKey) {
        console.log(
          '\n⚠️  Claude API key not found. Please set ANTHROPIC_API_KEY in your .env file.'
        );
        this.rl.close();
        return;
      }
    }

    // Initialize with default system message
    this.initialize();

    // Main chat loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const userInput = await this.getUserInput();

        // Handle empty input
        if (!userInput) {
          console.log('Please enter a message or command.');
          continue;
        }

        // Handle special commands
        const commandResult = this.handleCommand(userInput);
        if (commandResult === 'exit') {
          break;
        } else if (commandResult === true) {
          continue; // Command was handled, continue loop
        }

        // Send message to AI (streaming response is handled in sendMessage)
        const response = await this.sendMessage(userInput);

        // Response is already displayed via streaming, just check if we got one
        if (!response) {
          console.log('\n⚠️  No response received from AI.');
        }
      } catch (error) {
        if (error.message.includes('SIGINT') || error.message.includes('cancel')) {
          console.log('\n\n👋 Chat session ended.');
          break;
        }
        console.error(`\n❌ Error: ${error.message}`);
      }
    }

    // Cleanup
    this.rl.close();
    this.showStats();
    console.log('\n👋 Goodbye! Thanks for chatting!\n');

    // Restore terminal if needed
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      // Terminal will be restored automatically by readline
    }
  }
}

/**
 * Main function to start interactive chat
 */
async function interactiveChatExample() {
  // Determine which provider to use based on available API keys
  let provider = 'openai';

  if (config.claude.apiKey && !config.openai.apiKey) {
    provider = 'claude';
  }

  // Allow provider selection via command line argument
  const args = process.argv.slice(2);
  if (args.includes('--claude') || args.includes('-c')) {
    provider = 'claude';
  } else if (args.includes('--openai') || args.includes('-o')) {
    provider = 'openai';
  }

  const chat = new InteractiveChat(provider);
  await chat.start();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Chat session ended. Goodbye!\n');
  process.exit(0);
});

// Run the interactive chat
interactiveChatExample().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
