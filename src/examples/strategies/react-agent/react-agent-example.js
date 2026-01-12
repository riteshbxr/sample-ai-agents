import { createAIClient } from '../../../clients/client-factory.js';
import { providerUtils } from '../../../config.js';

/**
 * ReAct Agent Example
 * Demonstrates the ReAct (Reasoning + Acting) pattern used in galactiq
 *
 * ReAct agents combine reasoning (thinking about what to do) with acting (using tools).
 * This pattern is implemented using createReactAgent from LangGraph in galactiq.
 *
 * Key features:
 * - Reasoning: Agent thinks about the problem before acting
 * - Acting: Agent uses tools to gather information or perform actions
 * - Iterative: Agent can reason, act, observe, and reason again
 */

/**
 * Simple Tool Implementation
 * In galactiq, tools are defined using @langchain/core/tools
 */
class SimpleTool {
  constructor(name, description, execute) {
    this.name = name;
    this.description = description;
    this.execute = execute;
  }

  toFunctionSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: this.getParameters(),
        required: this.getRequiredParameters(),
      },
    };
  }

  getParameters() {
    return {};
  }

  getRequiredParameters() {
    return [];
  }
}

/**
 * Search Tool - Simulates web search
 */
class SearchTool extends SimpleTool {
  constructor(provider = 'openai') {
    super(
      'search',
      'Search the web for information about a topic. Use this when you need to find current information, facts, or data.',
      async ({ query }) => {
        const client = createAIClient(provider === 'openai' ? 'azure-openai' : 'claude');
        console.log(`  🔍 [Tool] Searching for: "${query}"`);
        // Simulate search results
        const response = await client.chat(
          [
            {
              role: 'system',
              content:
                'you are web search agent, search whatever resource you can use to find the answer to question asked by the user. Make assumption if needed and provide the answer in the same language as the question. ensure that you specify those assumptions in the answer',
            },
            { role: 'user', content: query },
          ],
          {
            temperature: 0.7,
          }
        );
        const result = client.getTextContent(response);
        console.log(`  ✅ [Tool] Result: ${result}`);
        return result;
      }
    );
  }

  getParameters() {
    return {
      query: {
        type: 'string',
        description: 'The search query',
      },
    };
  }

  getRequiredParameters() {
    return ['query'];
  }
}

/**
 * Calculator Tool - Performs calculations
 */
class CalculatorTool extends SimpleTool {
  constructor() {
    super(
      'calculator',
      'Perform mathematical calculations. Use this for arithmetic operations, comparisons, or number manipulations.',
      async ({ expression }) => {
        console.log(`  🧮 [Tool] Calculating: "${expression}"`);
        try {
          // Safe evaluation (in production, use a proper math parser)
          const result = Function(`"use strict"; return (${expression})`)();
          console.log(`  ✅ [Tool] Result: ${result}`);
          return String(result);
        } catch (error) {
          const errorMsg = `Error calculating: ${error.message}`;
          console.log(`  ❌ [Tool] ${errorMsg}`);
          return errorMsg;
        }
      }
    );
  }

  getParameters() {
    return {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")',
      },
    };
  }

  getRequiredParameters() {
    return ['expression'];
  }
}

/**
 * ReAct Agent Implementation
 * Simulates the createReactAgent pattern from LangGraph
 */
class ReactAgent {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.client = createAIClient(provider === 'openai' ? 'azure-openai' : 'claude');
    this.tools = new Map();
    this.conversationHistory = [];
    this.setupTools();
  }

  setupTools() {
    // Register available tools
    const searchTool = new SearchTool();
    const calculatorTool = new CalculatorTool();

    this.tools.set('search', searchTool);
    this.tools.set('calculator', calculatorTool);
  }

  /**
   * ReAct reasoning loop: Think -> Act -> Observe -> Think
   */
  async reactLoop(userQuery, maxIterations = 5) {
    console.log(`\n🤔 [ReAct] Starting reasoning loop for: "${userQuery}"\n`);

    let currentQuery = userQuery;
    let iteration = 0;
    const observations = [];

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n--- Iteration ${iteration} ---\n`);

      // Step 1: Think - Agent reasons about what to do
      console.log('💭 [Think] Agent reasoning...');
      const reasoning = await this.think(currentQuery, observations);
      console.log(`   Reasoning: ${reasoning.thought}\n`);

      // Check if agent thinks it's done
      if (reasoning.isComplete) {
        console.log('✅ [Complete] Agent believes task is complete');
        return reasoning.finalAnswer || reasoning.thought;
      }

      // Step 2: Act - Agent decides which tool to use
      if (!reasoning.toolToUse) {
        console.log('⚠️  [Warning] Agent wants to complete but no tool selected');
        return reasoning.thought;
      }

      console.log(`🔧 [Act] Agent decides to use: ${reasoning.toolToUse}`);
      console.log(`   Parameters: ${JSON.stringify(reasoning.toolParams)}\n`);

      // Step 3: Execute tool
      const tool = this.tools.get(reasoning.toolToUse);
      if (!tool) {
        const error = `Tool ${reasoning.toolToUse} not found`;
        console.log(`❌ [Error] ${error}`);
        observations.push(error);
        continue;
      }

      const observation = await tool.execute(reasoning.toolParams);
      observations.push({
        tool: reasoning.toolToUse,
        params: reasoning.toolParams,
        result: observation,
      });

      // Update query for next iteration
      currentQuery = `Based on the observations: ${JSON.stringify(
        observations
      )}, continue reasoning about: ${userQuery}`;
    }

    // Final answer after max iterations
    console.log(`\n⚠️  [Max Iterations] Reached maximum iterations (${maxIterations})`);
    const finalReasoning = await this.think(currentQuery, observations);
    return finalReasoning.finalAnswer || finalReasoning.thought;
  }

  /**
   * Think step - Agent reasons about what to do next
   * In galactiq, this is handled by the LLM with structured output
   */
  async think(query, observations) {
    const systemPrompt = `You are a ReAct (Reasoning + Acting) agent. Your job is to:
1. Reason about the user's query
2. Decide if you need to use a tool to gather information
3. If yes, select the appropriate tool and parameters
4. If no, provide a final answer

Available tools:
- search: Search for information (requires: query)
- calculator: Perform calculations (requires: expression)

Previous observations:
${observations.map((obs, i) => `  ${i + 1}. ${obs.tool}: ${obs.result}`).join('\n') || '  None yet'}

Think step by step. and use the observations to continue reasoning about the user's query. If you need more information, use a tool. If you have enough information, provide the final answer.

IMPORTANT: You must respond with valid JSON format. Your response should be a JSON object with the following structure:
{
  "thought": "your reasoning here",
  "tool": "tool_name or null",
  "params": {},
  "isComplete": true/false,
  "answer": "final answer if complete"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];

    // Get reasoning from LLM
    const chatOptions = {
      temperature: 0.7,
    };

    // Only add response_format for OpenAI providers (Claude doesn't support it)
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);

    try {
      const reasoning = JSON.parse(this.client.getTextContent(response));
      return {
        thought: reasoning.thought || reasoning.reasoning || 'Thinking...',
        toolToUse: reasoning.tool || null,
        toolParams: reasoning.params || {},
        isComplete: reasoning.isComplete || false,
        finalAnswer: reasoning.answer || null,
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      const content = this.client.getTextContent(response);
      return {
        thought: content,
        toolToUse: null,
        toolParams: {},
        isComplete: true,
        finalAnswer: content,
      };
    }
  }

  /**
   * Simplified ReAct execution (single-shot with tool use)
   * This is closer to how function calling works in practice
   */
  async executeWithTools(userQuery) {
    console.log(`\n🚀 [ReAct] Executing with tools: "${userQuery}"\n`);

    const systemPrompt = `You are a helpful assistant that can use tools to answer questions.
Available tools:
- search(query): Search for information
- calculator(expression): Perform calculations

When you need information, use the appropriate tool.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ];

    // Convert tools to function schemas
    const functions = Array.from(this.tools.values()).map((tool) => tool.toFunctionSchema());

    // Use unified interface method for function calling
    // Convert functions to tools format (chatWithTools handles both formats)
    const tools = functions.map((f) => ({
      name: f.name,
      description: f.description,
      parameters: f.parameters, // OpenAI format
      input_schema: f.parameters, // Claude format (chatWithTools will handle conversion)
    }));
    const response = await this.client.chatWithTools(messages, tools);

    // Check if tool was called
    const message = response.choices?.[0]?.message || response.content?.[0];
    const toolCalls =
      message.tool_calls || message.content?.filter((c) => c.type === 'tool_use') || [];

    if (toolCalls.length > 0) {
      console.log(`🔧 [ReAct] Tool calls detected: ${toolCalls.length}\n`);

      // Execute tools and get results
      const toolResults = [];
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name || toolCall.name;
        const toolParams = JSON.parse(
          toolCall.function?.arguments || JSON.stringify(toolCall.input || {})
        );

        const tool = this.tools.get(toolName);
        if (tool) {
          const result = await tool.execute(toolParams);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolName,
            content: result,
          });
        }
      }

      // Continue conversation with tool results
      messages.push(message);
      messages.push(...toolResults);
      messages.push({
        role: 'user',
        content: 'Based on the tool results, provide the final answer.',
      });

      const finalResponse = await this.client.chat(messages);
      return finalResponse.choices[0].message.content;
    }

    return message.content || message.text;
  }
}

/**
 * Main example function
 */
async function reactAgentExample() {
  console.log('=== ReAct Agent Example ===');
  console.log('Reasoning + Acting pattern used in galactiq\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  const agent = new ReactAgent(provider);

  try {
    // Example 1: Simple query that needs a tool
    console.log('📝 Example 1: Query requiring search tool');
    console.log('='.repeat(60));
    const result1 = await agent.executeWithTools('What is the weather today?');
    console.log(`\n📤 Final Answer: ${result1}\n`);

    // Example 2: Query requiring calculation
    console.log('\n\n📝 Example 2: Query requiring calculator tool');
    console.log('='.repeat(60));
    const result2 = await agent.executeWithTools('What is 15 multiplied by 23?');
    console.log(`\n📤 Final Answer: ${result2}\n`);

    // Example 3: Complex query requiring multiple tools
    console.log('\n\n📝 Example 3: Complex query (simulated ReAct loop)');
    console.log('='.repeat(60));
    const result3 = await agent.reactLoop(
      'What is 10 * 5 and then search for latest news of Maduro kidnapping?'
    );
    console.log(`\n📤 Final Answer: ${result3}\n`);

    console.log('\n✅ All ReAct agent examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Reasoning: Agent thinks before acting');
    console.log('  - Acting: Agent uses tools to gather information');
    console.log('  - Iterative: Agent can reason, act, observe, and reason again');
    console.log('  - Tool selection: Agent intelligently chooses which tool to use');
    console.log("  - Pattern matches galactiq's createReactAgent implementation");
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
reactAgentExample().catch(console.error);
