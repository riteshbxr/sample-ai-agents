/**
 * Playwright MCP Demo
 *
 * Demonstrates browser automation search using the Playwright MCP server.
 * Shows both headless (invisible) and headed (visible browser) modes.
 *
 * Usage: npm run demo:playwright-mcp
 * (Server starts automatically via menu)
 */

const MCP_URL = process.env.PLAYWRIGHT_MCP_URL || 'http://localhost:3001/run';

async function search(query, options = {}) {
  const { engine = 'google', headless = true, maxResults = 5 } = options;

  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'search',
      params: { query, engine, headless, maxResults },
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || 'Search failed');
  }

  return data.results;
}

function displayResults(results, label) {
  console.log(`\n${label}`);
  console.log('─'.repeat(50));

  if (results.length === 0) {
    console.log('  No results found');
    return;
  }

  for (const r of results) {
    console.log(`  📄 ${r.title}`);
    console.log(`     ${r.href}`);
    if (r.snippet) {
      console.log(`     ${r.snippet.replace(/\n/g, ' ').substring(0, 100)}...`);
    }
    console.log('');
  }
}

async function run() {
  console.log('=== Playwright MCP Demo ===\n');
  console.log('This demo shows browser automation for web search.');
  console.log('Playwright controls a real browser to perform searches.\n');

  // Example 1: Headless mode (default, no visible browser)
  console.log('🔍 Example 1: Headless Mode (invisible browser)');
  console.log('   The browser runs in the background - faster, no UI.\n');

  try {
    const headlessResults = await search('Model Context Protocol MCP', {
      engine: 'google',
      headless: true,
      maxResults: 3,
    });
    displayResults(headlessResults, '📋 Headless Results (Google):');
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
  }

  // Example 2: Headed mode (visible browser window)
  console.log('\n🔍 Example 2: Headed Mode (visible browser)');
  console.log('   Watch the browser open and perform the search!\n');

  try {
    const headedResults = await search('Playwright browser automation', {
      engine: 'google',
      headless: false, // Browser window will be visible
      maxResults: 3,
    });
    displayResults(headedResults, '📋 Headed Results (Google):');
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
  }

  // Example 3: Different search engine (Bing)
  console.log('\n🔍 Example 3: Using Bing Search Engine');

  try {
    const bingResults = await search('AI agents tutorial', {
      engine: 'bing',
      headless: true,
      maxResults: 3,
    });
    displayResults(bingResults, '📋 Bing Results:');
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
  }

  // Summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log('✅ Demo Complete\n');
  console.log('Key Options:');
  console.log('  • headless: true  → No visible browser (faster)');
  console.log('  • headless: false → Visible browser (debugging/demo)');
  console.log('  • engine: "google" or "bing"');
  console.log('  • maxResults: Number of results to return');
  console.log('\n⚠️  Note: Web scraping may violate TOS. Use official APIs in production.');
}

run().catch((err) => {
  console.error('Demo failed:', err.message);
  process.exitCode = 1;
});
