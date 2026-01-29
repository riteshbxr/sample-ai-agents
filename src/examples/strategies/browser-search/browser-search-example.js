import { BrowserSearchAgent, createBraveSearchProvider } from './browser-search-agent.js';
import { providerUtils } from '../../../config.js';

/**
 * Browser Search Agent Example
 *
 * This example demonstrates an AI agent with web search capabilities,
 * using the Brave Search API for real web searches.
 *
 * PREREQUISITES:
 * ==============
 * 1. Get a Brave Search API key: https://brave.com/search/api/ (free tier available)
 * 2. Set environment variable: export BRAVE_API_KEY=your_key
 *
 * USAGE:
 * ======
 * npm run demo:browser-search
 *
 * The agent can:
 * - Search the web for information via Brave Search
 * - Read and extract content from web pages
 * - Synthesize information from multiple sources
 * - Provide cited responses
 */

async function browserSearchExample() {
  console.log('=== Browser Search Agent Example ===\n');
  console.log('This example uses the Brave Search API for real web search.\n');

  // Check for API key
  if (!process.env.BRAVE_API_KEY) {
    console.error('❌ BRAVE_API_KEY environment variable is required!\n');
    console.log('Setup:');
    console.log('  1. Get a free API key: https://brave.com/search/api/');
    console.log('  2. Set env var: export BRAVE_API_KEY=your_key');
    console.log('  3. Run: npm run demo:browser-search\n');
    process.exitCode = 1;
    return;
  }

  console.log('✓ Brave API key found\n');

  // Choose AI provider
  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} AI provider\n`);

  // Create search provider using Brave Search API directly
  const searchProvider = createBraveSearchProvider();

  // Create agent with Brave search provider
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
  console.log('1. Search providers abstract the underlying search implementation');
  console.log('2. The agent uses tools to search and fetch web content');
  console.log('3. Multi-turn conversations maintain context across queries');
  console.log('4. Always cite sources when presenting web-sourced information');
  console.log('\n📦 Related examples in this project:');
  console.log('─'.repeat(60));
  console.log('1. Playwright MCP (browser automation):');
  console.log('   npm run demo:playwright-mcp:start');
  console.log('   npm run demo:playwright-search');
}

// Run the example
browserSearchExample().catch(console.error);
