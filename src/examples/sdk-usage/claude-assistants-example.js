import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils, defaultOptions } from '../../config.js';

/**
 * Claude Assistants-like Example
 * Demonstrates persistent AI conversations with tool use using Claude's Messages API
 * While Claude doesn't have an Assistants API like OpenAI, this shows similar patterns
 * using Claude's Messages API with tool use capabilities
 */
class ClaudeAssistant {
  constructor(instructions, tools = []) {
    this.client = createAIClient('claude');
    this.instructions = instructions;
    this.tools = tools;
    this.conversations = new Map(); // Store conversation threads
  }

  /**
   * Create a new conversation thread
   * @param {string} threadId - Optional thread ID, generates one if not provided
   * @returns {string} Thread ID
   */
  createThread(threadId = null) {
    const id = threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.conversations.set(id, {
      id,
      messages: [],
      createdAt: new Date(),
    });
    return id;
  }

  /**
   * Add a message to a thread
   * @param {string} threadId - Thread ID
   * @param {string} role - Message role (user or assistant)
   * @param {string} content - Message content
   */
  addMessage(threadId, role, content) {
    const thread = this.conversations.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    thread.messages.push({
      role,
      content,
    });
  }

  /**
   * Execute a tool/function
   * @param {string} name - Tool name
   * @param {Object} input - Tool input
   * @returns {Promise<any>} Tool result
   */
  async executeTool(name, input) {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return { error: `Tool ${name} not found` };
    }

    try {
      const result = await tool.implementation(input);
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Run assistant on a thread
   * @param {string} threadId - Thread ID
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} Assistant response
   */
  async run(threadId, userMessage) {
    const thread = this.conversations.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    // Add user message to thread
    this.addMessage(threadId, 'user', userMessage);

    // Build messages array from thread history (excluding the last user message we just added)
    // Convert thread messages to Claude message format
    const messages = thread.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let maxIterations = 5;
    let iteration = 0;
    let finalResponse = '';

    while (iteration < maxIterations) {
      iteration++;

      // Prepare tools in Claude format
      const claudeTools = this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }));

      // Call Claude with tools if available
      const response =
        this.tools.length > 0
          ? await this.client.chatWithTools(messages, claudeTools, {
              system: this.instructions,
              ...defaultOptions.getDefaultOptions(),
            })
          : await this.client.chat(messages, {
              system: this.instructions,
              ...defaultOptions.getDefaultOptions(),
            });

      // Check for tool use
      const toolUseBlocks = this.client.getToolUseBlocks(response);

      if (toolUseBlocks.length > 0) {
        // Execute tools and add results
        const toolResults = [];
        for (const toolUse of toolUseBlocks) {
          const result = await this.executeTool(toolUse.name, toolUse.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        }

        // Add assistant message with tool use to messages array
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Add tool results as user message
        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue conversation with tool results
        continue;
      } else {
        // No tool use, get final response
        finalResponse = this.client.getTextContent(response);

        // Add assistant response to thread
        this.addMessage(threadId, 'assistant', finalResponse);

        return {
          threadId,
          response: finalResponse,
          status: 'completed',
        };
      }
    }

    return {
      threadId,
      response: finalResponse || 'Max iterations reached',
      status: 'completed',
    };
  }

  /**
   * Get thread messages
   * @param {string} threadId - Thread ID
   * @returns {Array} Messages in thread
   */
  getThreadMessages(threadId) {
    const thread = this.conversations.get(threadId);
    return thread ? thread.messages : [];
  }

  /**
   * List all threads
   * @returns {Array} List of thread IDs
   */
  listThreads() {
    return Array.from(this.conversations.keys());
  }
}

async function claudeAssistantsExample() {
  console.log('=== Claude Assistants-like Example ===\n');
  console.log('💡 Note: Claude uses Messages API with tool use, not a separate Assistants API');
  console.log('   This example demonstrates similar persistent conversation patterns\n');

  if (!providerUtils.isProviderAvailable('claude')) {
    console.log('⚠️  Claude API key required for this example');
    console.log('   Please set ANTHROPIC_API_KEY in your .env file');
    return;
  }

  try {
    // Define tools (similar to OpenAI Assistants API)
    const tools = [
      {
        name: 'searchDocumentation',
        description: 'Search code documentation',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
        implementation: async ({ query }) => {
          // Simulate documentation search
          return {
            results: [
              `Documentation result for "${query}": Found 3 relevant pages`,
              `Page 1: Introduction to ${query}`,
              `Page 2: Advanced ${query} patterns`,
            ],
            count: 3,
          };
        },
      },
      {
        name: 'calculate',
        description: 'Perform mathematical calculations',
        input_schema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'Mathematical expression to evaluate',
            },
          },
          required: ['expression'],
        },
        implementation: async ({ expression }) => {
          try {
            // Simple safe evaluation (in production, use a proper math parser)
            const result = Function(`"use strict"; return (${expression})`)();
            return { result, expression };
          } catch (error) {
            return { error: 'Invalid expression', expression };
          }
        },
      },
    ];

    // Step 1: Create an Assistant
    console.log('1️⃣ Creating a Claude Assistant...');
    console.log('-'.repeat(60));

    const assistant = new ClaudeAssistant(
      `You are a helpful coding assistant for a startup. 
      You help developers with:
      - Code reviews
      - Debugging
      - Best practices
      - Architecture decisions
      
      Always provide clear, concise answers with code examples when relevant.
      Use tools when appropriate to help answer questions.`,
      tools
    );

    console.log('✅ Claude Assistant created');
    console.log(`   Tools available: ${tools.length}`);
    console.log(`   Instructions: ${assistant.instructions.substring(0, 100)}...\n`);

    // Step 2: Create a Thread
    console.log('2️⃣ Creating a Thread...');
    console.log('-'.repeat(60));

    const threadId = assistant.createThread();
    console.log(`✅ Thread created: ${threadId}\n`);

    // Step 3: Add messages and run the assistant
    console.log('3️⃣ Running Assistant on Thread...');
    console.log('-'.repeat(60));

    const userMessage = 'What are the best practices for error handling in Node.js?';
    console.log(`👤 User: ${userMessage}\n`);

    console.log('🤖 Processing...');
    const run1 = await assistant.run(threadId, userMessage);

    if (run1.status === 'completed') {
      console.log('✅ Run completed!\n');
      console.log('🤖 Assistant Response:');
      console.log('-'.repeat(60));
      console.log(run1.response.substring(0, 500) + (run1.response.length > 500 ? '...' : ''));
      console.log('-'.repeat(60));
    }

    console.log('\n');

    // Step 4: Continue conversation
    console.log('4️⃣ Continuing Conversation...');
    console.log('-'.repeat(60));

    const followUp = 'Can you search the documentation for async/await patterns?';
    console.log(`👤 User: ${followUp}\n`);

    console.log('🤖 Processing...');
    const run2 = await assistant.run(threadId, followUp);

    if (run2.status === 'completed') {
      console.log('✅ Run completed!\n');
      console.log('🤖 Assistant Response:');
      console.log('-'.repeat(60));
      console.log(run2.response.substring(0, 500) + (run2.response.length > 500 ? '...' : ''));
      console.log('-'.repeat(60));
    }

    console.log('\n');

    // Step 5: List all messages in thread
    console.log('5️⃣ Thread History:');
    console.log('-'.repeat(60));

    const allMessages = assistant.getThreadMessages(threadId);
    console.log(`Total messages in thread: ${allMessages.length}`);
    allMessages.forEach((msg, idx) => {
      console.log(`\n${idx + 1}. ${msg.role.toUpperCase()}:`);
      const preview =
        typeof msg.content === 'string'
          ? msg.content.substring(0, 100)
          : JSON.stringify(msg.content).substring(0, 100);
      console.log(`   ${preview}...`);
    });

    console.log('\n💡 Key Differences from OpenAI Assistants API:');
    console.log('-'.repeat(60));
    console.log('1. Claude uses Messages API with tool use, not a separate Assistants API');
    console.log('2. Conversation state is managed through the messages array');
    console.log('3. Tools are defined inline with each request (or can be reused)');
    console.log('4. No separate "assistants" or "runs" - just messages with tool use');
    console.log('5. System instructions are passed with each request');
    console.log('6. Similar functionality but different API structure');

    console.log('\n💡 Similarities:');
    console.log('-'.repeat(60));
    console.log('1. Both support persistent conversations');
    console.log('2. Both support tool/function calling');
    console.log('3. Both maintain conversation history');
    console.log('4. Both can handle multi-turn conversations');
    console.log('5. Both support custom instructions');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('API key') || error.message.includes('401')) {
      console.log('\n💡 Make sure ANTHROPIC_API_KEY is set correctly in your .env file');
    }
  }
}

claudeAssistantsExample().catch(console.error);
