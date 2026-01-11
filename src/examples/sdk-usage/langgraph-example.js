import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { config } from '../../config.js';

/**
 * LangGraph Example
 * Demonstrates building stateful, multi-actor agent workflows with LangGraph
 *
 * LangGraph is a library for building stateful, multi-actor applications with LLMs.
 * It provides a graph-based approach to building agent workflows with cycles and state management.
 */

// Define the state structure using Annotation.Root (LangGraph 1.0 API)
const graphState = Annotation.Root({
  messages: Annotation({
    reducer: (existing, incoming) => existing.concat(incoming),
    default: () => [],
  }),
  step: Annotation({
    reducer: (existing, incoming) => incoming ?? existing,
    default: () => 0,
  }),
  researchComplete: Annotation({
    reducer: (existing, incoming) => incoming ?? existing,
    default: () => false,
  }),
  analysisComplete: Annotation({
    reducer: (existing, incoming) => incoming ?? existing,
    default: () => false,
  }),
});

/**
 * Research Node - Gathers information about a topic
 */
async function researchNode(state) {
  console.log('  🔍 [Research Node] Gathering information...');

  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage.content;

  // Extract topic from user query
  const topic = userQuery.includes('about')
    ? userQuery.split('about')[1]?.trim() || userQuery
    : userQuery;

  // Mock research - in production, use real APIs
  const researchData = {
    'AI agents':
      'AI agents are autonomous systems that can perform tasks using AI models. They can use tools, make decisions, and interact with external systems.',
    RAG: 'RAG (Retrieval-Augmented Generation) combines retrieval and generation for knowledge-based AI. It retrieves relevant documents and uses them to generate accurate responses.',
    'function calling':
      'Function calling allows AI to use external tools and APIs. It enables agents to perform actions beyond text generation.',
  };

  const findings =
    researchData[topic] ||
    `Research completed for: ${topic}. Key findings include relevant information about the topic.`;

  const researchMessage = new AIMessage(
    `Research findings for "${topic}":\n${findings}\n\nSources: source1, source2, source3`
  );

  return {
    messages: [researchMessage],
    step: state.step + 1,
    researchComplete: true,
  };
}

/**
 * Analysis Node - Analyzes the research findings
 */
async function analysisNode(state) {
  console.log('  📊 [Analysis Node] Analyzing research findings...');

  const researchMessage = state.messages.find((msg) => msg.content.includes('Research findings'));

  if (!researchMessage) {
    return {
      messages: [new AIMessage('No research findings to analyze.')],
      step: state.step + 1,
    };
  }

  const analysis = `Analysis of research findings:
  - Key insights identified
  - Patterns and trends recognized
  - Recommendations prepared
  - Risk factors assessed`;

  const analysisMessage = new AIMessage(analysis);

  return {
    messages: [analysisMessage],
    step: state.step + 1,
    analysisComplete: true,
  };
}

/**
 * LLM Node - Uses LLM to process and respond
 */
async function llmNode(state) {
  console.log('  🤖 [LLM Node] Processing with LLM...');

  const apiKey = config.openai.azureApiKey || config.openai.standardApiKey;
  if (!apiKey) {
    throw new Error('AZURE_OPENAI_API_KEY or OPENAI_API_KEY is required for LangGraph LLM node');
  }

  // Configure ChatOpenAI for Azure OpenAI or standard OpenAI
  let llm;

  // Debug: Check Azure configuration
  const isAzure = config.openai.azure.enabled && config.openai.azure.endpoint;
  if (isAzure) {
    console.log(`  🔍 Azure OpenAI detected: endpoint=${config.openai.azure.endpoint}`);

    // Azure OpenAI configuration
    const endpoint = config.openai.azure.endpoint.replace(/\/$/, '');
    const deployment = config.openai.azure.deployment || config.openai.model;

    // Extract resource name from endpoint (e.g., https://resource.openai.azure.com -> resource)
    const endpointMatch = endpoint.match(/https?:\/\/([^.]+)\./);
    const instanceName = endpointMatch ? endpointMatch[1] : null;

    if (instanceName) {
      // Use AzureChatOpenAI class for Azure OpenAI
      llm = new AzureChatOpenAI({
        azureOpenAIApiKey: apiKey,
        azureOpenAIApiInstanceName: instanceName,
        azureOpenAIApiDeploymentName: deployment,
        azureOpenAIApiVersion: config.openai.azure.apiVersion || '2024-02-15-preview',
        temperature: 0.7,
      });
      console.log(`  🔧 Using AzureChatOpenAI: instance=${instanceName}, deployment=${deployment}`);
    } else {
      // Fallback to baseURL approach with ChatOpenAI
      let baseURL = endpoint;
      if (!baseURL.includes('/openai/v1')) {
        baseURL = `${baseURL}/openai/v1`;
      }
      llm = new ChatOpenAI({
        model: deployment,
        temperature: 0.7,
        apiKey: apiKey,
        baseURL: baseURL,
      });
      console.log(`  🔧 Using ChatOpenAI with Azure baseURL: ${baseURL}, deployment=${deployment}`);
    }
  } else {
    // Standard OpenAI configuration
    llm = new ChatOpenAI({
      model: config.openai.model,
      temperature: 0.7,
      apiKey: apiKey,
    });
    console.log(`  🔧 Using standard ChatOpenAI`);
  }

  const response = await llm.invoke(state.messages);

  return {
    messages: [response],
    step: state.step + 1,
  };
}

/**
 * Decision Node - Decides next step based on state
 */
function decisionNode(state) {
  console.log('  🤔 [Decision Node] Making routing decision...');

  const researchComplete = state.researchComplete;
  const analysisComplete = state.analysisComplete;

  // Simple routing logic
  if (!researchComplete) {
    return 'research';
  } else if (!analysisComplete) {
    return 'analysis';
  } else {
    return 'end';
  }
}

/**
 * Simple Agent Graph - Linear workflow
 */
function createSimpleAgentGraph() {
  const workflow = new StateGraph(graphState);

  // Add nodes
  workflow.addNode('research', researchNode);
  workflow.addNode('analysis', analysisNode);
  workflow.addNode('llm', llmNode);

  // Add edges
  workflow.addEdge(START, 'research');
  workflow.addEdge('research', 'analysis');
  workflow.addEdge('analysis', 'llm');
  workflow.addEdge('llm', END);

  return workflow.compile();
}

/**
 * Conditional Agent Graph - With decision routing
 */
function createConditionalAgentGraph() {
  const workflow = new StateGraph(graphState);

  // Add nodes
  workflow.addNode('research', researchNode);
  workflow.addNode('analysis', analysisNode);
  workflow.addNode('llm', llmNode);

  // Add edges with conditional routing
  workflow.addEdge(START, 'research');
  workflow.addConditionalEdges('research', decisionNode, {
    research: 'analysis',
    analysis: 'analysis',
    end: END,
  });
  workflow.addConditionalEdges('analysis', decisionNode, {
    research: 'research',
    analysis: 'llm',
    end: END,
  });
  workflow.addEdge('llm', END);

  return workflow.compile();
}

/**
 * Multi-Agent Graph - Multiple agents working together
 */
function createMultiAgentGraph() {
  const multiAgentState = Annotation.Root({
    messages: Annotation({
      reducer: (existing, incoming) => existing.concat(incoming),
      default: () => [],
    }),
    step: Annotation({
      reducer: (existing, incoming) => incoming ?? existing,
      default: () => 0,
    }),
    researchComplete: Annotation({
      reducer: (existing, incoming) => incoming ?? existing,
      default: () => false,
    }),
    analysisComplete: Annotation({
      reducer: (existing, incoming) => incoming ?? existing,
      default: () => false,
    }),
    agent1Complete: Annotation({
      reducer: (existing, incoming) => incoming ?? existing,
      default: () => false,
    }),
    agent2Complete: Annotation({
      reducer: (existing, incoming) => incoming ?? existing,
      default: () => false,
    }),
  });

  const workflow = new StateGraph(multiAgentState);

  // Agent 1: Researcher
  workflow.addNode('agent1_research', async (state) => {
    console.log('  👤 [Agent 1] Researching...');
    const result = await researchNode(state);
    return { ...result, agent1Complete: true };
  });

  // Agent 2: Analyst
  workflow.addNode('agent2_analysis', async (state) => {
    console.log('  👤 [Agent 2] Analyzing...');
    const result = await analysisNode(state);
    return { ...result, agent2Complete: true };
  });

  // Synthesizer: Combines results
  workflow.addNode('synthesize', async (state) => {
    console.log('  🔗 [Synthesizer] Combining agent results...');
    const synthesis = new AIMessage(
      'Synthesized results from both agents:\n- Combined research findings\n- Integrated analysis\n- Final recommendations'
    );
    return {
      messages: [synthesis],
      step: state.step + 1,
    };
  });

  // Parallel execution
  workflow.addEdge(START, 'agent1_research');
  workflow.addEdge('agent1_research', 'agent2_analysis');
  workflow.addEdge('agent2_analysis', 'synthesize');
  workflow.addEdge('synthesize', END);

  return workflow.compile();
}

/**
 * Example 1: Simple Linear Workflow
 */
async function simpleWorkflowExample() {
  console.log('\n1️⃣ Simple Linear Workflow');
  console.log('='.repeat(60));

  const graph = createSimpleAgentGraph();

  const initialState = {
    messages: [new HumanMessage('Research about AI agents')],
    step: 0,
    researchComplete: false,
    analysisComplete: false,
  };

  console.log('\n📥 Input:', initialState.messages[0].content);
  console.log('\n🔄 Executing workflow...\n');

  const result = await graph.invoke(initialState);

  console.log('\n📤 Final State:');
  console.log(`Steps completed: ${result.step}`);
  console.log(`Research complete: ${result.researchComplete}`);
  console.log(`Analysis complete: ${result.analysisComplete}`);
  console.log('\n💬 Messages:');
  result.messages.forEach((msg, i) => {
    const role = msg instanceof HumanMessage ? 'Human' : 'AI';
    console.log(`  ${i + 1}. [${role}]: ${msg.content.substring(0, 100)}...`);
  });
}

/**
 * Example 2: Conditional Workflow
 */
async function conditionalWorkflowExample() {
  console.log('\n\n2️⃣ Conditional Workflow with Decision Routing');
  console.log('='.repeat(60));

  const graph = createConditionalAgentGraph();

  const initialState = {
    messages: [new HumanMessage('Analyze the benefits of RAG systems')],
    step: 0,
    researchComplete: false,
    analysisComplete: false,
  };

  console.log('\n📥 Input:', initialState.messages[0].content);
  console.log('\n🔄 Executing workflow with conditional routing...\n');

  const result = await graph.invoke(initialState);

  console.log('\n📤 Final State:');
  console.log(`Steps completed: ${result.step}`);
  console.log(`Research complete: ${result.researchComplete}`);
  console.log(`Analysis complete: ${result.analysisComplete}`);
}

/**
 * Example 3: Multi-Agent Collaboration
 */
async function multiAgentExample() {
  console.log('\n\n3️⃣ Multi-Agent Collaboration');
  console.log('='.repeat(60));

  const graph = createMultiAgentGraph();

  const initialState = {
    messages: [new HumanMessage('Research and analyze function calling in AI')],
    step: 0,
    researchComplete: false,
    analysisComplete: false,
    agent1Complete: false,
    agent2Complete: false,
  };

  console.log('\n📥 Input:', initialState.messages[0].content);
  console.log('\n🔄 Executing multi-agent workflow...\n');

  const result = await graph.invoke(initialState);

  console.log('\n📤 Final State:');
  console.log(`Steps completed: ${result.step}`);
  console.log(`Agent 1 complete: ${result.agent1Complete}`);
  console.log(`Agent 2 complete: ${result.agent2Complete}`);
  console.log('\n💬 Final Synthesis:');
  const synthesis = result.messages.find((msg) => msg.content.includes('Synthesized results'));
  if (synthesis) {
    console.log(`  ${synthesis.content}`);
  }
}

/**
 * Example 4: Streaming Workflow
 */
async function streamingWorkflowExample() {
  console.log('\n\n4️⃣ Streaming Workflow');
  console.log('='.repeat(60));

  if (!config.openai.azureApiKey && !config.openai.standardApiKey) {
    console.log('⚠️  Skipping streaming example - AZURE_OPENAI_API_KEY or OPENAI_API_KEY not set');
    return;
  }

  const graph = createSimpleAgentGraph();

  const initialState = {
    messages: [new HumanMessage('What are the latest trends in AI?')],
    step: 0,
    researchComplete: false,
    analysisComplete: false,
  };

  console.log('\n📥 Input:', initialState.messages[0].content);
  console.log('\n🔄 Executing workflow with streaming...\n');

  // Stream the workflow execution
  // LangGraph 1.0 requires await and streamMode option
  const stream = await graph.stream(initialState, { streamMode: 'updates' });

  for await (const event of stream) {
    // Event format: { "nodeName": { state updates } }
    const nodeName = Object.keys(event)[0];
    const nodeState = event[nodeName];
    if (nodeState && typeof nodeState === 'object') {
      const step = nodeState.step !== undefined ? nodeState.step : 'N/A';
      console.log(`  ✅ Node "${nodeName}" completed (step ${step})`);
    } else {
      console.log(`  ✅ Node "${nodeName}" completed`);
    }
  }

  console.log('\n✅ Workflow streaming completed');
}

/**
 * Main example function
 */
async function langgraphExample() {
  console.log('=== LangGraph Example ===');
  console.log('Building stateful, multi-actor agent workflows\n');

  try {
    // Example 1: Simple workflow
    await simpleWorkflowExample();

    // Example 2: Conditional workflow
    await conditionalWorkflowExample();

    // Example 3: Multi-agent
    await multiAgentExample();

    // Example 4: Streaming
    await streamingWorkflowExample();

    console.log('\n\n✅ All LangGraph examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Stateful workflows with graph-based architecture');
    console.log('  - Conditional routing and decision making');
    console.log('  - Multi-agent collaboration');
    console.log('  - Streaming execution');
    console.log('  - State management across nodes');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('API_KEY') || error.message.includes('API key')) {
      console.log(
        '\n💡 Tip: Set AZURE_OPENAI_API_KEY or OPENAI_API_KEY environment variable for LLM node examples'
      );
      if (config.openai.azure.enabled) {
        console.log(
          '   For Azure OpenAI, also set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT'
        );
      }
    }
  }
}

// Run the example
langgraphExample().catch(console.error);
