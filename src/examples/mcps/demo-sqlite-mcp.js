/**
 * Demo: SQLite MCP Client
 * Demonstrates database operations via the SQLite MCP server
 *
 * Prerequisites: Start the server first:
 *   node examples/mcps/sqlite-mcp-server.js
 *
 * Usage: node src/examples/mcps/demo-sqlite-mcp.js
 */

const MCP_URL = process.env.SQLITE_MCP_URL || 'http://localhost:3004/run';

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
  console.log('=== SQLite MCP Demo ===\n');
  console.log(`Connecting to: ${MCP_URL}\n`);

  try {
    // 1. List existing tables
    console.log('1. Listing tables...');
    const tables = await callMCP('list_tables');
    console.log(`   Tables: ${tables.tables.join(', ')}`);
    console.log('');

    // 2. Get schema
    console.log('2. Getting schema...');
    const schema = await callMCP('get_schema');
    Object.entries(schema.schema).forEach(([table, info]) => {
      console.log(`   📋 ${table}: ${info.rowCount} rows`);
    });
    console.log('');

    // 3. Query existing users
    console.log('3. Selecting all users...');
    const users = await callMCP('select', { table: 'users' });
    console.log(`   Found ${users.count} users:`);
    users.rows.forEach((user) => {
      console.log(`   👤 ${user.name} (${user.email}) - Age: ${user.age}`);
    });
    console.log('');

    // 4. Create a new table
    console.log('4. Creating products table...');
    await callMCP('create_table', {
      name: 'products',
      columns: ['id', 'name', 'price', 'category'],
    });
    console.log('   ✅ Table created');
    console.log('');

    // 5. Insert data
    console.log('5. Inserting products...');
    await callMCP('insert', {
      table: 'products',
      data: { name: 'Laptop', price: 999, category: 'electronics' },
    });
    await callMCP('insert', {
      table: 'products',
      data: { name: 'Coffee Mug', price: 15, category: 'kitchen' },
    });
    await callMCP('insert', {
      table: 'products',
      data: { name: 'Headphones', price: 150, category: 'electronics' },
    });
    console.log('   ✅ Inserted 3 products');
    console.log('');

    // 6. Query with filters
    console.log('6. Querying electronics products...');
    const electronics = await callMCP('select', {
      table: 'products',
      where: { category: 'electronics' },
    });
    console.log(`   Found ${electronics.count} electronics:`);
    electronics.rows.forEach((p) => {
      console.log(`   🛒 ${p.name} - $${p.price}`);
    });
    console.log('');

    // 7. Query with ordering and limit
    console.log('7. Top 2 most expensive products...');
    const expensive = await callMCP('select', {
      table: 'products',
      orderBy: 'price DESC',
      limit: 2,
    });
    expensive.rows.forEach((p) => {
      console.log(`   💰 ${p.name} - $${p.price}`);
    });
    console.log('');

    // 8. Update a row
    console.log('8. Updating product price...');
    await callMCP('update', {
      table: 'products',
      where: { name: 'Laptop' },
      data: { price: 899 },
    });
    const updated = await callMCP('select', {
      table: 'products',
      where: { name: 'Laptop' },
    });
    console.log(`   ✅ Laptop new price: $${updated.rows[0].price}`);
    console.log('');

    // 9. Count rows
    console.log('9. Counting users over 25...');
    const count = await callMCP('count', {
      table: 'users',
      where: { age: { $gt: 25 } },
    });
    console.log(`   Users over 25: ${count.count}`);
    console.log('');

    // 10. Execute SQL-like query
    console.log('10. Executing SQL query...');
    const sqlResult = await callMCP('query', {
      sql: 'SELECT * FROM users WHERE age > 25',
    });
    console.log(`   SQL returned ${sqlResult.count} rows`);
    console.log('');

    // 11. Clean up - delete the test table
    console.log('11. Cleaning up...');
    await callMCP('drop_table', { name: 'products' });
    console.log('   ✅ Dropped products table');
    console.log('');

    console.log('=== Demo Complete ===');
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is the SQLite MCP server running?');
      console.error('   Start it with: node examples/mcps/sqlite-mcp-server.js');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
