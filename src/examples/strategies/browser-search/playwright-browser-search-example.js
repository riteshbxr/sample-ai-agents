/**
 * Playwright Browser Search Agent Example
 *
 * This example demonstrates an AI agent with web search capabilities
 * using the local Playwright MCP server for real browser-based searches.
 *
 * PREREQUISITES:
 * ==============
 * 1. Install Playwright browsers: npx playwright install
 *
 * USAGE:
 * ======
 * npm run demo:playwright-search
 *
 * The MCP server is started automatically when running via the menu.
 *
 * COMPARISON:
 * ===========
 * - browser-search-example.js: Uses Brave Search API (no browser)
 * - playwright-browser-search-example.js: Uses real Playwright browser automation (this file)
 */

import { BrowserSearchAgent, createPlaywrightSearchProvider } from './browser-search-agent.js';
import { providerUtils } from '../../../config.js';

async function playwrightBrowserSearchExample() {
  console.log('=== Playwright Browser Search Agent Example ===\n');
  console.log('This example uses the Playwright MCP server for real browser-based web search.\n');

  const playwrightUrl = process.env.PLAYWRIGHT_MCP_URL || 'http://localhost:3001';

  // Choose AI provider
  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} AI provider\n`);

  // Create search provider using Playwright
  const searchProvider = createPlaywrightSearchProvider({
    baseUrl: playwrightUrl,
    engine: 'google', // or 'bing'
    headless: true,
  });

  // Create agent with Playwright search provider
  const agent = new BrowserSearchAgent(provider, { searchProvider });

  // Example queries
  const queries = [
    'What is the Model Context Protocol (MCP)?',
    'Latest news about AI agents and automation',
  ];

  for (const query of queries) {
    console.log('─'.repeat(60));
    console.log(`\n👤 User: ${query}\n`);
    console.log('🔍 Agent searching with Playwright...');

    try {
      const response = await agent.chat(query);
      console.log(`\n🤖 Agent:\n${response}\n`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\nHint: Make sure the Playwright MCP server is still running.');
      }
    }

    // Reset conversation for next query
    agent.resetConversation();
  }

  console.log('─'.repeat(60));
  console.log('\n✅ Playwright Browser Search Example Complete');
  console.log('\nKey Points:');
  console.log('1. Playwright performs real browser automation for searches');
  console.log('2. Results come from actual Google/Bing search pages');
  console.log('3. The MCP server pattern decouples the agent from browser logic');
  console.log('4. Consider rate limiting and caching for production use');
  console.log('\n⚠️  Note: Web scraping may violate TOS. Use official APIs in production.');
}

// Run the example
playwrightBrowserSearchExample().catch((err) => {
  console.error('Example failed:', err);
  process.exitCode = 1;
});
