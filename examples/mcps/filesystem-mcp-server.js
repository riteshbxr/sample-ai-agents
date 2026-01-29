/**
 * Filesystem MCP Server
 * Provides file system operations: read, write, list, delete
 *
 * Usage: node examples/mcps/filesystem-mcp-server.js
 * Then call via HTTP POST to http://localhost:3002/run
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(express.json());

// Configurable root directory (defaults to current working directory)
const ROOT_DIR = process.env.MCP_ROOT_DIR || process.cwd();

// Security: ensure path is within allowed directory
function resolveSafePath(relativePath) {
  const resolved = path.resolve(ROOT_DIR, relativePath);
  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}

// Available methods
const methods = {
  // Read file contents
  async read_file({ path: filePath, encoding = 'utf-8' }) {
    const safePath = resolveSafePath(filePath);
    const content = await fs.readFile(safePath, encoding);
    return { content, path: filePath, size: content.length };
  },

  // Write content to file
  async write_file({ path: filePath, content, encoding = 'utf-8' }) {
    const safePath = resolveSafePath(filePath);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, encoding);
    const stats = await fs.stat(safePath);
    return { success: true, path: filePath, size: stats.size };
  },

  // Append content to file
  async append_file({ path: filePath, content, encoding = 'utf-8' }) {
    const safePath = resolveSafePath(filePath);
    await fs.appendFile(safePath, content, encoding);
    const stats = await fs.stat(safePath);
    return { success: true, path: filePath, size: stats.size };
  },

  // List directory contents
  async list_directory({ path: dirPath = '.', recursive = false }) {
    const safePath = resolveSafePath(dirPath);
    const entries = await fs.readdir(safePath, { withFileTypes: true });

    const results = [];
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(path.join(safePath, entry.name));

      const item = {
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };

      results.push(item);

      if (recursive && entry.isDirectory()) {
        const subItems = await methods.list_directory({
          path: entryPath,
          recursive: true,
        });
        results.push(...subItems.entries);
      }
    }

    return { entries: results, count: results.length };
  },

  // Get file/directory info
  async get_info({ path: targetPath }) {
    const safePath = resolveSafePath(targetPath);
    const stats = await fs.stat(safePath);

    return {
      path: targetPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
    };
  },

  // Delete file or directory
  async delete({ path: targetPath, recursive = false }) {
    const safePath = resolveSafePath(targetPath);
    const stats = await fs.stat(safePath);

    if (stats.isDirectory()) {
      await fs.rm(safePath, { recursive });
    } else {
      await fs.unlink(safePath);
    }

    return { success: true, path: targetPath };
  },

  // Create directory
  async create_directory({ path: dirPath, recursive = true }) {
    const safePath = resolveSafePath(dirPath);
    await fs.mkdir(safePath, { recursive });
    return { success: true, path: dirPath };
  },

  // Move/rename file or directory
  async move({ source, destination }) {
    const sourcePath = resolveSafePath(source);
    const destPath = resolveSafePath(destination);
    await fs.rename(sourcePath, destPath);
    return { success: true, source, destination };
  },

  // Copy file
  async copy({ source, destination }) {
    const sourcePath = resolveSafePath(source);
    const destPath = resolveSafePath(destination);
    await fs.copyFile(sourcePath, destPath);
    return { success: true, source, destination };
  },

  // Search for files by pattern
  async search({ path: dirPath = '.', pattern, recursive = true }) {
    const regex = new RegExp(pattern, 'i');
    const results = [];

    async function searchDir(dir) {
      const safePath = resolveSafePath(dir);
      const entries = await fs.readdir(safePath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);

        if (regex.test(entry.name)) {
          results.push({
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? 'directory' : 'file',
          });
        }

        if (recursive && entry.isDirectory()) {
          await searchDir(entryPath);
        }
      }
    }

    await searchDir(dirPath);
    return { matches: results, count: results.length, pattern };
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
      code: err.code,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rootDir: ROOT_DIR });
});

// List available methods
app.get('/methods', (req, res) => {
  res.json({
    methods: Object.keys(methods),
    rootDir: ROOT_DIR,
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Filesystem MCP server listening on http://localhost:${PORT}/run`);
  console.log(`Root directory: ${ROOT_DIR}`);
  console.log(`Available methods: ${Object.keys(methods).join(', ')}`);
});
