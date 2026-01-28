import { BrowserSearchAgent, createBraveSearchProvider } from './browser-search-agent.js';
import { providerUtils } from '../../../config.js';

/**
 * Browser Search Agent Example
 *
 * This example demonstrates an AI agent with web search capabilities,
 * following the MCP (Model Context Protocol) pattern for tool use.
 *
 * The agent can:
 * - Search the web for information
 * - Read and extract content from web pages
 * - Synthesize information from multiple sources
 * - Provide cited responses
 *
 * RECOMMENDED MCP FOR BROWSER SEARCH:
 * ===================================
 * Brave Search MCP is the best option for web search:
 * - Official: https://github.com/brave/brave-search-mcp-server
 * - Install: npx @anthropic-ai/brave-search-mcp-server
 * - Get API key: https://brave.com/search/api/ (free tier available)
 *
 * Other MCP options:
 * - Fetch MCP (@modelcontextprotocol/server-fetch) - Web content fetching
 * - Playwright MCP - Full browser automation
 * - Tavily MCP - AI-optimized search
 */

async function browserSearchExample() {
  console.log('=== Browser Search Agent Example ===\n');
  console.log('This example shows how to build an AI agent with web search capabilities.');
  console.log(
    'The agent uses tools to search and read web content, similar to MCP browser integration.\n'
  );

  // Choose provider
  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  // Check for Brave Search API key for real search
  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (braveApiKey) {
    console.log('✓ Brave Search API key found - using real search\n');
  } else {
    console.log('ℹ Using mock search (set BRAVE_SEARCH_API_KEY for real search)\n');
    console.log('Get a free API key at: https://brave.com/search/api/\n');
  }

  // Create agent with optional real search provider
  const searchProvider = braveApiKey
    ? createBraveSearchProvider({ apiKey: braveApiKey })
    : undefined;

  const agent = new BrowserSearchAgent(provider, { searchProvider });

  // Example queries that will use search tools
  const queries = [
    'What is the Model Context Protocol (MCP) and what is it used for?',
    'Compare GPT-4 and Claude 3 - what are their key features?',
    'What are common patterns for building AI agents?',
  ];

  for (const query of queries) {
    console.log('─'.repeat(60));
    console.log(`\n👤 User: ${query}\n`);
    console.log('🔍 Agent searching...');

    try {
      const response = await agent.chat(query);
      console.log(`\n🤖 Agent:\n${response}\n`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }

    // Reset conversation for next query
    agent.resetConversation();
  }

  console.log('─'.repeat(60));
  console.log('\n=== Multi-turn Conversation Example ===\n');

  // Demonstrate multi-turn conversation
  const conversationAgent = new BrowserSearchAgent(provider, { searchProvider });

  const conversation = [
    'Tell me about OpenAI GPT-4',
    'What about its context window size?',
    'How does that compare to Claude?',
  ];

  for (const message of conversation) {
    console.log(`\n👤 User: ${message}\n`);
    console.log('🔍 Agent processing...');

    try {
      const response = await conversationAgent.chat(message);
      console.log(`\n🤖 Agent:\n${response}\n`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }

  console.log('─'.repeat(60));
  console.log('\n✅ Browser Search Agent Example Complete');
  console.log('\nKey Takeaways:');
  console.log('1. Web search enables agents to access current information');
  console.log('2. Tool calling follows the MCP pattern for structured interactions');
  console.log('3. Multi-turn conversations maintain context across queries');
  console.log('4. Always cite sources when presenting web-sourced information');
  console.log('\n📦 Recommended MCP Servers for Browser/Search:');
  console.log('─'.repeat(60));
  console.log('1. Brave Search MCP (BEST for search):');
  console.log('   npx @anthropic-ai/brave-search-mcp-server');
  console.log('   https://github.com/brave/brave-search-mcp-server');
  console.log('\n2. Fetch MCP (web content fetching):');
  console.log('   npx @modelcontextprotocol/server-fetch');
  console.log('\n3. Playwright MCP (full browser automation):');
  console.log(
    '   https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-server-playwright'
  );
  console.log('\n4. Tavily MCP (AI-optimized search):');
  console.log('   https://github.com/tavily-ai/tavily-mcp');
}

// Run the example
browserSearchExample().catch(console.error);
