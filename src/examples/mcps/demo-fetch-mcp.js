/**
 * Demo: Fetch MCP Client
 * Demonstrates HTTP fetching and web scraping via the Fetch MCP server
 *
 * Prerequisites: Start the server first:
 *   node examples/mcps/fetch-mcp-server.js
 *
 * Usage: node src/examples/mcps/demo-fetch-mcp.js
 */

const MCP_URL = process.env.FETCH_MCP_URL || 'http://localhost:3003/run';

async function callMCP(method, params = {}) {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || 'MCP call failed');
  }
  return data.result;
}

async function main() {
  console.log('=== Fetch MCP Demo ===\n');
  console.log(`Connecting to: ${MCP_URL}\n`);

  try {
    // 1. Check if a URL is accessible
    console.log('1. Checking URL accessibility...');
    const checkResult = await callMCP('check_url', {
      url: 'https://httpbin.org/get',
    });
    console.log(`   URL: ${checkResult.url}`);
    console.log(`   Accessible: ${checkResult.accessible ? '✅ Yes' : '❌ No'}`);
    console.log(`   Status: ${checkResult.status} ${checkResult.statusText}`);
    console.log('');

    // 2. Fetch JSON from an API
    console.log('2. Fetching JSON from API...');
    const jsonResult = await callMCP('fetch_json', {
      url: 'https://httpbin.org/json',
    });
    console.log(`   Status: ${jsonResult.status}`);
    console.log(`   Data preview: ${JSON.stringify(jsonResult.data).slice(0, 100)}...`);
    console.log('');

    // 3. Fetch a web page
    console.log('3. Fetching web page...');
    const fetchResult = await callMCP('fetch', {
      url: 'https://example.com',
    });
    console.log(`   Status: ${fetchResult.status} ${fetchResult.statusText}`);
    console.log(`   Content-Type: ${fetchResult.contentType}`);
    console.log(`   Body length: ${fetchResult.bodyLength} bytes`);
    console.log('');

    // 4. Extract text content
    console.log('4. Extracting text content...');
    const textResult = await callMCP('fetch_text', {
      url: 'https://example.com',
    });
    console.log(`   Original HTML: ${textResult.originalLength} bytes`);
    console.log(`   Extracted text: ${textResult.textLength} chars`);
    console.log(`   Preview: "${textResult.text.slice(0, 150)}..."`);
    console.log('');

    // 5. Extract metadata
    console.log('5. Extracting page metadata...');
    const metaResult = await callMCP('extract_metadata', {
      url: 'https://example.com',
    });
    console.log('   Metadata:');
    Object.entries(metaResult.metadata).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('');

    // 6. Extract links
    console.log('6. Extracting links from page...');
    const linksResult = await callMCP('extract_links', {
      url: 'https://example.com',
    });
    console.log(`   Found ${linksResult.count} links:`);
    linksResult.links.slice(0, 5).forEach((link) => {
      console.log(`   🔗 ${link}`);
    });
    if (linksResult.count > 5) {
      console.log(`   ... and ${linksResult.count - 5} more`);
    }
    console.log('');

    // 7. POST request
    console.log('7. Sending POST request...');
    const postResult = await callMCP('post', {
      url: 'https://httpbin.org/post',
      body: { message: 'Hello from Fetch MCP!', timestamp: Date.now() },
    });
    console.log(`   Status: ${postResult.status}`);
    console.log(
      `   Response received: ${typeof postResult.body === 'object' ? 'JSON object' : 'text'}`
    );
    console.log('');

    console.log('=== Demo Complete ===');
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is the Fetch MCP server running?');
      console.error('   Start it with: node examples/mcps/fetch-mcp-server.js');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
