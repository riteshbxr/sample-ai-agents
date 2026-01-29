/**
 * SQLite MCP Server
 * Provides SQLite database operations: query, execute, schema inspection
 *
 * This is a lightweight in-memory implementation that doesn't require
 * the native better-sqlite3 package. For production, use better-sqlite3.
 *
 * Usage: node examples/mcps/sqlite-mcp-server.js
 * Then call via HTTP POST to http://localhost:3004/run
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Simple in-memory SQL-like storage
// For real SQLite, use better-sqlite3 or sql.js (WebAssembly SQLite)
class SimpleDatabase {
  constructor() {
    this.tables = new Map();
    this.metadata = new Map();
  }

  createTable(name, columns) {
    if (this.tables.has(name)) {
      throw new Error(`Table ${name} already exists`);
    }
    this.tables.set(name, []);
    this.metadata.set(name, { columns, createdAt: new Date().toISOString() });
    return { success: true, table: name };
  }

  dropTable(name) {
    if (!this.tables.has(name)) {
      throw new Error(`Table ${name} does not exist`);
    }
    this.tables.delete(name);
    this.metadata.delete(name);
    return { success: true, table: name };
  }

  insert(table, data) {
    if (!this.tables.has(table)) {
      throw new Error(`Table ${table} does not exist`);
    }
    const id = Date.now() + Math.random();
    const row = { _id: id, ...data, _createdAt: new Date().toISOString() };
    this.tables.get(table).push(row);
    return { success: true, id, rowsAffected: 1 };
  }

  select(table, where = {}, options = {}) {
    if (!this.tables.has(table)) {
      throw new Error(`Table ${table} does not exist`);
    }
    let rows = this.tables.get(table);

    // Apply WHERE conditions
    if (Object.keys(where).length > 0) {
      rows = rows.filter((row) => {
        return Object.entries(where).every(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Handle operators like { $gt: 5 }
            if ('$gt' in value) return row[key] > value.$gt;
            if ('$gte' in value) return row[key] >= value.$gte;
            if ('$lt' in value) return row[key] < value.$lt;
            if ('$lte' in value) return row[key] <= value.$lte;
            if ('$ne' in value) return row[key] !== value.$ne;
            if ('$like' in value) return String(row[key]).includes(value.$like);
          }
          return row[key] === value;
        });
      });
    }

    // Apply ORDER BY
    if (options.orderBy) {
      const [field, dir] = options.orderBy.split(' ');
      const direction = dir?.toLowerCase() === 'desc' ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        if (a[field] < b[field]) return -1 * direction;
        if (a[field] > b[field]) return 1 * direction;
        return 0;
      });
    }

    // Apply LIMIT and OFFSET
    if (options.offset) {
      rows = rows.slice(options.offset);
    }
    if (options.limit) {
      rows = rows.slice(0, options.limit);
    }

    // Select specific columns
    if (options.columns && options.columns.length > 0) {
      rows = rows.map((row) => {
        const selected = {};
        options.columns.forEach((col) => {
          if (col in row) selected[col] = row[col];
        });
        return selected;
      });
    }

    return { rows, count: rows.length };
  }

  update(table, where, data) {
    if (!this.tables.has(table)) {
      throw new Error(`Table ${table} does not exist`);
    }
    let updated = 0;
    const rows = this.tables.get(table);

    rows.forEach((row, index) => {
      const matches = Object.entries(where).every(([key, value]) => row[key] === value);
      if (matches) {
        rows[index] = { ...row, ...data, _updatedAt: new Date().toISOString() };
        updated++;
      }
    });

    return { success: true, rowsAffected: updated };
  }

  delete(table, where) {
    if (!this.tables.has(table)) {
      throw new Error(`Table ${table} does not exist`);
    }
    const rows = this.tables.get(table);
    const initialCount = rows.length;

    const remaining = rows.filter((row) => {
      return !Object.entries(where).every(([key, value]) => row[key] === value);
    });

    this.tables.set(table, remaining);
    return { success: true, rowsAffected: initialCount - remaining.length };
  }

  getSchema() {
    const schema = {};
    for (const [name, meta] of this.metadata.entries()) {
      schema[name] = {
        ...meta,
        rowCount: this.tables.get(name)?.length || 0,
      };
    }
    return schema;
  }

  getTables() {
    return Array.from(this.tables.keys());
  }

  count(table, where = {}) {
    const result = this.select(table, where);
    return { table, count: result.count };
  }

  // Export to JSON
  exportData() {
    const data = {};
    for (const [name, rows] of this.tables.entries()) {
      data[name] = {
        metadata: this.metadata.get(name),
        rows,
      };
    }
    return data;
  }

  // Import from JSON
  importData(data) {
    for (const [name, tableData] of Object.entries(data)) {
      this.tables.set(name, tableData.rows || []);
      this.metadata.set(name, tableData.metadata || { columns: [] });
    }
    return { success: true, tablesImported: Object.keys(data).length };
  }
}

// Global database instance
const db = new SimpleDatabase();

// Initialize with a sample table
db.createTable('users', ['id', 'name', 'email', 'age']);
db.insert('users', { name: 'Alice', email: 'alice@example.com', age: 30 });
db.insert('users', { name: 'Bob', email: 'bob@example.com', age: 25 });
db.insert('users', { name: 'Charlie', email: 'charlie@example.com', age: 35 });

// Available methods
const methods = {
  // List all tables
  async list_tables() {
    return { tables: db.getTables() };
  },

  // Get database schema
  async get_schema() {
    return { schema: db.getSchema() };
  },

  // Create a new table
  async create_table({ name, columns }) {
    return db.createTable(name, columns);
  },

  // Drop a table
  async drop_table({ name }) {
    return db.dropTable(name);
  },

  // Insert a row
  async insert({ table, data }) {
    return db.insert(table, data);
  },

  // Select rows
  async select({ table, where = {}, columns, orderBy, limit, offset }) {
    return db.select(table, where, { columns, orderBy, limit, offset });
  },

  // Update rows
  async update({ table, where, data }) {
    return db.update(table, where, data);
  },

  // Delete rows
  async delete({ table, where }) {
    return db.delete(table, where);
  },

  // Count rows
  async count({ table, where = {} }) {
    return db.count(table, where);
  },

  // Execute raw SQL-like query (simplified)
  async query({ sql }) {
    // Parse simple SQL statements
    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.startsWith('select')) {
      // Very basic SELECT parser
      const match = sql.match(/select\s+(.+)\s+from\s+(\w+)(?:\s+where\s+(.+))?/i);
      if (match) {
        const [, columns, table, whereClause] = match;
        const cols = columns === '*' ? undefined : columns.split(',').map((c) => c.trim());
        const where = {};
        if (whereClause) {
          const conditions = whereClause.split(/\s+and\s+/i);
          conditions.forEach((cond) => {
            const [, col, op, val] = cond.match(/(\w+)\s*(=|>|<|>=|<=)\s*['"]?(\w+)['"]?/i) || [];
            if (col && val) {
              const value = isNaN(val) ? val : Number(val);
              if (op === '=') where[col] = value;
              else if (op === '>') where[col] = { $gt: value };
              else if (op === '<') where[col] = { $lt: value };
              else if (op === '>=') where[col] = { $gte: value };
              else if (op === '<=') where[col] = { $lte: value };
            }
          });
        }
        return db.select(table, where, { columns: cols });
      }
    }

    if (sqlLower.startsWith('insert')) {
      const match = sql.match(/insert\s+into\s+(\w+)\s*\((.+)\)\s*values\s*\((.+)\)/i);
      if (match) {
        const [, table, cols, vals] = match;
        const columns = cols.split(',').map((c) => c.trim());
        const values = vals.split(',').map((v) => {
          v = v.trim().replace(/^['"]|['"]$/g, '');
          return isNaN(v) ? v : Number(v);
        });
        const data = {};
        columns.forEach((col, i) => {
          data[col] = values[i];
        });
        return db.insert(table, data);
      }
    }

    throw new Error('Unsupported SQL statement. Use structured methods instead.');
  },

  // Export database to JSON
  async export_data() {
    return db.exportData();
  },

  // Import database from JSON
  async import_data({ data }) {
    return db.importData(data);
  },
};

// Main endpoint
app.post('/run', async (req, res) => {
  const { method, params } = req.body || {};

  if (!method || !methods[method]) {
    return res.status(400).json({
      ok: false,
      error: `Unknown method: ${method}. Available: ${Object.keys(methods).join(', ')}`,
    });
  }

  try {
    const result = await methods[method](params || {});
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tables: db.getTables() });
});

// List available methods
app.get('/methods', (req, res) => {
  res.json({ methods: Object.keys(methods) });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`SQLite MCP server listening on http://localhost:${PORT}/run`);
  console.log(`Available methods: ${Object.keys(methods).join(', ')}`);
  console.log(`Sample table 'users' created with 3 rows`);
});
