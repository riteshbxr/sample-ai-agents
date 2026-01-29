/**
 * Demo: Filesystem MCP Client
 * Demonstrates file system operations via the Filesystem MCP server
 *
 * Prerequisites: Start the server first:
 *   node examples/mcps/filesystem-mcp-server.js
 *
 * Usage: node src/examples/mcps/demo-filesystem-mcp.js
 */

const MCP_URL = process.env.FILESYSTEM_MCP_URL || 'http://localhost:3002/run';

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
  console.log('=== Filesystem MCP Demo ===\n');
  console.log(`Connecting to: ${MCP_URL}\n`);

  try {
    // 1. List current directory
    console.log('1. Listing current directory...');
    const listing = await callMCP('list_directory', { path: '.', recursive: false });
    console.log(`   Found ${listing.count} items:`);
    listing.entries.slice(0, 5).forEach((entry) => {
      const icon = entry.type === 'directory' ? '📁' : '📄';
      console.log(`   ${icon} ${entry.name}`);
    });
    if (listing.count > 5) console.log(`   ... and ${listing.count - 5} more`);
    console.log('');

    // 2. Create a test directory
    console.log('2. Creating test directory...');
    const testDir = 'mcp-test-temp';
    await callMCP('create_directory', { path: testDir });
    console.log(`   ✅ Created: ${testDir}\n`);

    // 3. Write a file
    console.log('3. Writing test file...');
    const testFile = `${testDir}/hello.txt`;
    await callMCP('write_file', {
      path: testFile,
      content: 'Hello from Filesystem MCP!\nThis is a test file.\n',
    });
    console.log(`   ✅ Written: ${testFile}\n`);

    // 4. Read the file back
    console.log('4. Reading file back...');
    const readResult = await callMCP('read_file', { path: testFile });
    console.log(`   Content (${readResult.size} bytes):`);
    console.log(`   "${readResult.content.trim()}"\n`);

    // 5. Append to file
    console.log('5. Appending to file...');
    await callMCP('append_file', {
      path: testFile,
      content: 'Appended line!\n',
    });
    const updated = await callMCP('read_file', { path: testFile });
    console.log(`   Updated content (${updated.size} bytes):`);
    console.log(`   "${updated.content.trim()}"\n`);

    // 6. Get file info
    console.log('6. Getting file info...');
    const info = await callMCP('get_info', { path: testFile });
    console.log(`   Type: ${info.type}`);
    console.log(`   Size: ${info.size} bytes`);
    console.log(`   Modified: ${info.modified}\n`);

    // 7. Copy file
    console.log('7. Copying file...');
    const copyPath = `${testDir}/hello-copy.txt`;
    await callMCP('copy', { source: testFile, destination: copyPath });
    console.log(`   ✅ Copied to: ${copyPath}\n`);

    // 8. Search for files
    console.log('8. Searching for .txt files...');
    const searchResults = await callMCP('search', {
      path: testDir,
      pattern: '\\.txt$',
    });
    console.log(`   Found ${searchResults.count} matches:`);
    searchResults.matches.forEach((match) => {
      console.log(`   📄 ${match.path}`);
    });
    console.log('');

    // 9. Clean up - delete test directory
    console.log('9. Cleaning up...');
    await callMCP('delete', { path: testDir, recursive: true });
    console.log(`   ✅ Deleted: ${testDir}\n`);

    console.log('=== Demo Complete ===');
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is the Filesystem MCP server running?');
      console.error('   Start it with: node examples/mcps/filesystem-mcp-server.js');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
