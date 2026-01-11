#!/usr/bin/env node

/**
 * Main entry point for the AI Agents Demo
 * Run examples or start interactive mode
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version info
const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AI Agents Demo - JavaScript Implementation        ║
║                    Version ${packageJson.version}                          ║
╚══════════════════════════════════════════════════════════════╝

Available examples:
  npm run demo:chat          - Simple chat example
  npm run demo:streaming     - Streaming responses
  npm run demo:agent         - Function calling agent
  npm run demo:rag           - RAG (Retrieval-Augmented Generation)
  npm run demo:multi-model   - Compare different models

Make sure you have set up your .env file with API keys!
See README.md for more information.
`);
