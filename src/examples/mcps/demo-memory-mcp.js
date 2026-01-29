/**
 * Demo: Memory MCP Client
 * Demonstrates persistent knowledge storage via the Memory MCP server
 *
 * Prerequisites: Start the server first:
 *   node examples/mcps/memory-mcp-server.js
 *
 * Usage: node src/examples/mcps/demo-memory-mcp.js
 */

const MCP_URL = process.env.MEMORY_MCP_URL || 'http://localhost:3005/run';

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
  console.log('=== Memory MCP Demo ===\n');
  console.log(`Connecting to: ${MCP_URL}\n`);

  try {
    // 1. Get current memory stats
    console.log('1. Getting memory stats...');
    const stats = await callMCP('get_stats');
    console.log(`   Entities: ${stats.entities}`);
    console.log(`   Facts: ${stats.facts}`);
    console.log(`   Notes: ${stats.notes}`);
    console.log(`   Conversations: ${stats.conversations}`);
    console.log('');

    // 2. Find existing entities
    console.log('2. Finding company entities...');
    const companies = await callMCP('find_entities', { type: 'company' });
    companies.entities.forEach((e) => {
      console.log(`   🏢 ${e.name}: ${e.properties.products?.join(', ') || 'N/A'}`);
    });
    console.log('');

    // 3. Create a new entity
    console.log('3. Creating a new entity...');
    const newEntity = await callMCP('create_entity', {
      name: 'Claude',
      type: 'ai_model',
      properties: {
        developer: 'Anthropic',
        capabilities: ['chat', 'analysis', 'coding'],
        released: 2023,
      },
    });
    console.log(`   ✅ Created: ${newEntity.name} (${newEntity.id})`);
    console.log('');

    // 4. Add facts
    console.log('4. Adding facts...');
    await callMCP('add_fact', {
      subject: 'Claude',
      predicate: 'has_capability',
      object: 'tool_use',
      confidence: 1.0,
      source: 'official documentation',
    });
    await callMCP('add_fact', {
      subject: 'MCP',
      predicate: 'enables',
      object: 'AI tool integration',
      confidence: 0.95,
    });
    console.log('   ✅ Added 2 facts');
    console.log('');

    // 5. Query facts
    console.log('5. Querying facts about Claude...');
    const claudeFacts = await callMCP('query_facts', { subject: 'Claude' });
    claudeFacts.facts.forEach((f) => {
      console.log(`   📝 ${f.subject} ${f.predicate} ${f.object}`);
    });
    console.log('');

    // 6. Add notes
    console.log('6. Adding notes...');
    await callMCP('add_note', {
      content: 'Remember to use createAIClient() factory for all client creation',
      tags: ['best-practice', 'coding', 'ai-agents'],
    });
    console.log('   ✅ Note added');
    console.log('');

    // 7. Search notes
    console.log('7. Searching notes with tag "ai"...');
    const notes = await callMCP('search_notes', { tags: ['ai'] });
    notes.notes.forEach((n) => {
      console.log(`   📋 ${n.content.slice(0, 60)}...`);
      console.log(`      Tags: ${n.tags.join(', ')}`);
    });
    console.log('');

    // 8. Save conversation summary
    console.log('8. Saving conversation summary...');
    await callMCP('save_conversation', {
      conversationId: 'conv_demo_123',
      summary: 'User learned about MCP servers and how to create them',
      keyPoints: [
        'MCP is a protocol for AI tools',
        'Servers expose methods via HTTP',
        'Clients call servers',
      ],
      entities: ['MCP', 'AI', 'HTTP'],
    });
    console.log('   ✅ Conversation saved');
    console.log('');

    // 9. Retrieve conversation
    console.log('9. Retrieving conversation...');
    const conv = await callMCP('get_conversation', { conversationId: 'conv_demo_123' });
    console.log(`   Summary: ${conv.summary}`);
    console.log(`   Key points: ${conv.keyPoints.length}`);
    console.log('');

    // 10. Search across all memory
    console.log('10. Searching for "Claude" across all memory...');
    const searchResults = await callMCP('search', { query: 'Claude', limit: 5 });
    console.log(`   Found ${searchResults.results.length} results:`);
    searchResults.results.forEach((r) => {
      console.log(`   [${r.type}] Score: ${r.score}`);
      if (r.type === 'entity') console.log(`      ${r.item.name}`);
      if (r.type === 'fact')
        console.log(`      ${r.item.subject} ${r.item.predicate} ${r.item.object}`);
      if (r.type === 'note') console.log(`      ${r.item.content.slice(0, 50)}...`);
    });
    console.log('');

    // 11. Final stats
    console.log('11. Final memory stats...');
    const finalStats = await callMCP('get_stats');
    console.log(`   Entities: ${finalStats.entities}`);
    console.log(`   Facts: ${finalStats.facts}`);
    console.log(`   Notes: ${finalStats.notes}`);
    console.log(`   Conversations: ${finalStats.conversations}`);
    console.log('');

    console.log('=== Demo Complete ===');
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is the Memory MCP server running?');
      console.error('   Start it with: node examples/mcps/memory-mcp-server.js');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
