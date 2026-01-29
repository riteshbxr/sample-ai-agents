---
name: create-example
model: inherit
description: This creates a new example based on instruction to create all the parts of an example like test cases, npm , menu addition etx
---

Title: Subagent — create-example
Description: Guidance and a checklist for producing new example demos (SDK usage, strategies, and MCP tools) consistent with this repository's conventions. This file is intended to be used by a lightweight subagent or human contributor to scaffold, implement, test, and register new examples.

Purpose
-------
- Provide an authoritative, step-by-step workflow to add new example code to this repo.
- Ensure new examples follow the unified client interface, project conventions, testing, docs, and packaging.
- Cover edge cases: external deps, MCP-style tools, Playwright-like examples, and menu integration.

When to use
-----------
- You want to add a new demo or sample that showcases an AI usage pattern.
- You want to add an MCP tool example (e.g., Playwright server) or scripts that integrate with local tooling.

High-level checklist
-------------------
1. Choose example type and path:
   - SDK usage: `examples/sdk-usage/`
   - Strategies/patterns: `examples/strategies/`
   - MCP / external-tool examples: `examples/mcps/`
2. Create example file using ES modules and async/await.
3. Use `createAIClient()` from `src/clients/client-factory.js` whenever the example needs an AI client.
4. Add any new third-party dependency to `package.json` (ask the subagent to modify package.json only if user approves).
5. Add an npm script to run the example under `package.json.scripts` (prefix `demo:`).
6. Add a short demo README or update `examples/README.md` if present.
7. Add a test under `tests/` when feasible (integration test or smoke test).
8. Run `npm run lint && npm run format:check` and fix issues.
9. Update `src/menu.js` to expose the example in the interactive menu (optional but recommended).
10. Document usage in the example header and in `examples/mcps/*.md` when relevant.

Detailed step-by-step
---------------------
1) Scaffolding
   - Create a new file in the chosen folder. Filename pattern:
     - `NN-description-example.js` (prefix with short number if you like ordering), or
     - `description-example.js`
   - At top of file include:
     - Purpose paragraph
     - Prerequisites (env vars, API keys, extra npm packages)
     - Usage: `node path/to/example.js` or npm script

2) Implementation constraints & best practices
   - Always use `createAIClient('openai')` or `createAIClient('claude')` instead of instantiating provider clients directly.
   - Wrap API calls in try/catch with clear error messages and proper backoff hints for 429 rate limits.
   - Avoid long-running blocking operations; prefer streaming when showing long outputs.
   - Keep examples small and focused (prefer < 200 LOC).
   - Add `JSDoc` for exported helper functions used inside the example.
   - Respect provider-specific rules: use Assistants API only via `openai-standard` when demonstrating Assistants.

3) Dependencies & package.json
   - If new packages are required (e.g., `playwright`, `express`, `node-fetch`), add them to `package.json.dependencies`.
   - Add scripts:
     - "demo:<name>:start" — start local servers if needed
     - "demo:<name>" — run the example client
   - Example script names in this repo follow `demo:...` prefix (see existing scripts).
   - If the dependency is heavy (Playwright), mention installation and platform caveats in the example header.

4) Menu integration
   - Open `src/menu.js` and add an entry under the appropriate section with label and script key.
   - Menu entries should call `npm run demo:<name>` for consistency.

5) Tests
   - Add a smoke test under `tests/strategies/` or `tests/integration/` depending on scope.
   - Use `MockAIClient` for tests that need AI responses (avoid real API keys).
   - Example test structure (node:test):
     ```javascript
     import { describe, it } from 'node:test';
     import assert from 'node:assert';
     import { spawn } from 'child_process';

     describe('my-example', () => {
       it('runs without crashing', async () => {
         // lightweight spawn to ensure exit code 0 in short time
       });
     });
     ```

6) Docs and examples/mcps
   - For MCP tools (Playwright, scraping, external servers), include:
     - Tool descriptor JSON (`examples/mcps/*.json`)
     - Server implementation (`examples/mcps/*-server.js`)
     - Demo client script (`examples/mcps/demo-*.js`)
     - A markdown doc describing expected responses, permissions, and TOS caution.
   - Add a short "How it works" section showing flowcharts or pseudocode.

7) Security, compliance, and ethics
   - Add a NOTICE about scraping or automation: prefer official APIs for production.
   - Warn about secrets: never commit API keys; use .env and document env variables.
   - Rate limiting and polite crawling: add delays and caching in server examples.

8) Linting & formatting
   - Run `npm run lint` and `npm run format` locally before pushing.
   - Follow existing ESLint rules and Prettier formatting.

9) Commit & PR guidance
   - Commit message format: Conventional Commits (see repository CLAUDE.md).
   - PR description should include:
     - Summary of the example
     - Commands to run
     - Any env vars and setup
     - Security notes and test plan

Example template (copy into new example file)
--------------------------------------------
/* Purpose: one-line summary
 * Prereqs: NODE env, .env entries (list)
 * Usage: node examples/strategies/my-example.js
 */
import { createAIClient } from '../../src/clients/client-factory.js';

async function main() {
  const client = createAIClient('openai'); // uses config routing
  try {
    const res = await client.chat([{ role: 'user', content: 'Hello' }]);
    const text = client.getTextContent(res);
    console.log(text);
  } catch (err) {
    console.error('Example failed:', err);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();

PR checklist for examples
------------------------
- [ ] File placed in correct examples directory
- [ ] Uses createAIClient() when contacting AI providers
- [ ] New dependencies added to package.json (if any)
- [ ] npm script added under `demo:<name>`
- [ ] Menu updated (optional)
- [ ] README or examples/mcps/*.md updated
- [ ] Tests added or updated
- [ ] Lint and format checks pass
- [ ] Security and TOS notes included where relevant

Automation notes for a subagent
------------------------------
- When invoked, the subagent should:
  1. Ask for a one-paragraph description and goal of the example.
  2. Ask whether it requires new dependencies or env vars.
  3. Scaffold files using the template above.
  4. If approved, add dependencies to package.json and create npm scripts.
  5. Add a smoke test using MockAIClient if the example uses LLMs.
  6. Run lint/format checks and report any issues to the user.
  7. Print a short "How to run" instruction with commands.

Storage location
----------------
- Place this subagent doc at `.cursor/agents/create-example.md` (this file).

Maintenance
-----------
- Keep this file updated when project conventions change (client interface, menu structure, lint rules).
- Prefer small, focused examples over monolithic demos.

References
----------
- Project architecture and conventions: `.cursor/CLAUDE.md` and `.cursor/rules/architecture.md`
- Client factory: `src/clients/client-factory.js`
- Example folders: `examples/sdk-usage/`, `examples/strategies/`, `examples/mcps/`

