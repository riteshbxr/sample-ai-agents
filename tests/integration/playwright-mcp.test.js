import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('Playwright MCP descriptor', () => {
  it('defines the search method in the descriptor JSON', () => {
    const p = path.resolve('examples/mcps/playwright-browser-search.json');
    const raw = fs.readFileSync(p, 'utf8');
    const descriptor = JSON.parse(raw);
    assert.ok(Array.isArray(descriptor.methods), 'methods should be an array');
    const hasSearch = descriptor.methods.some((m) => m.name === 'search');
    assert.ok(hasSearch, 'descriptor should define a "search" method');
  });
});
