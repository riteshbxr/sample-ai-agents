/**
 * Demo: Git MCP Client
 * Demonstrates Git operations via the Git MCP server
 *
 * Prerequisites: Start the server first:
 *   node examples/mcps/git-mcp-server.js
 *
 * Usage: node src/examples/mcps/demo-git-mcp.js
 */

const MCP_URL = process.env.GIT_MCP_URL || 'http://localhost:3006/run';

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
  console.log('=== Git MCP Demo ===\n');
  console.log(`Connecting to: ${MCP_URL}\n`);

  try {
    // 1. Get repository info
    console.log('1. Getting repository info...');
    const info = await callMCP('info');
    console.log(`   📁 Repository: ${info.repoPath}`);
    console.log(`   🌿 Branch: ${info.currentBranch}`);
    console.log(`   🔗 Remote: ${info.remoteUrl}`);
    console.log(`   📊 Total commits: ${info.totalCommits}`);
    console.log(`   📝 Last commit: ${info.lastCommit.message}`);
    console.log('');

    // 2. Get repository status
    console.log('2. Getting repository status...');
    const status = await callMCP('status');
    console.log(`   Branch: ${status.branch}`);
    console.log(`   Clean: ${status.clean ? '✅ Yes' : '❌ No'}`);
    if (!status.clean) {
      if (status.files.staged.length > 0) {
        console.log(`   Staged: ${status.files.staged.length} files`);
      }
      if (status.files.modified.length > 0) {
        console.log(`   Modified: ${status.files.modified.join(', ')}`);
      }
      if (status.files.untracked.length > 0) {
        console.log(`   Untracked: ${status.files.untracked.length} files`);
      }
    }
    console.log('');

    // 3. Get recent commits
    console.log('3. Getting recent commits...');
    const log = await callMCP('log', { limit: 5 });
    console.log('   Recent commits:');
    log.commits.forEach((c) => {
      console.log(
        `   • ${c.hash.slice(0, 7)} - ${c.message.slice(0, 50)}${c.message.length > 50 ? '...' : ''}`
      );
      console.log(`     by ${c.author} on ${c.date}`);
    });
    console.log('');

    // 4. List branches
    console.log('4. Listing branches...');
    const branches = await callMCP('branches');
    console.log(`   Current: ${branches.current}`);
    console.log('   All branches:');
    branches.branches.slice(0, 5).forEach((b) => {
      const marker = b.name === branches.current ? '* ' : '  ';
      console.log(`   ${marker}${b.name} (${b.commit})`);
    });
    if (branches.branches.length > 5) {
      console.log(`   ... and ${branches.branches.length - 5} more`);
    }
    console.log('');

    // 5. Show latest commit details
    console.log('5. Showing latest commit details...');
    const commit = await callMCP('show', { stat: true });
    console.log(`   Hash: ${commit.hash}`);
    console.log(`   Author: ${commit.author} <${commit.email}>`);
    console.log(`   Date: ${commit.date}`);
    console.log(`   Subject: ${commit.subject}`);
    if (commit.body) {
      console.log(`   Body: ${commit.body.slice(0, 100)}...`);
    }
    console.log('');

    // 6. Get contributors
    console.log('6. Getting contributors...');
    const contrib = await callMCP('contributors');
    console.log('   Top contributors:');
    contrib.contributors.slice(0, 5).forEach((c) => {
      console.log(`   👤 ${c.name} - ${c.commits} commits`);
    });
    console.log('');

    // 7. Search commits
    console.log('7. Searching for commits with "fix"...');
    const searchResult = await callMCP('search', { query: 'fix', type: 'message' });
    console.log(`   Found ${searchResult.commits.length} commits:`);
    searchResult.commits.slice(0, 3).forEach((c) => {
      console.log(`   • ${c.hash.slice(0, 7)} - ${c.message.slice(0, 50)}`);
    });
    console.log('');

    // 8. List tags
    console.log('8. Listing tags...');
    const tags = await callMCP('tags', { limit: 5 });
    if (tags.tags.length > 0) {
      console.log('   Tags:');
      tags.tags.forEach((t) => {
        console.log(`   🏷️  ${t.name}${t.message ? ` - ${t.message}` : ''}`);
      });
    } else {
      console.log('   No tags found');
    }
    console.log('');

    // 9. Get changed files in last commit
    console.log('9. Files changed in last commit...');
    const changed = await callMCP('changed_files', { from: 'HEAD~1', to: 'HEAD' });
    console.log(`   Files changed (${changed.from} → ${changed.to}):`);
    changed.files.slice(0, 5).forEach((f) => {
      const icon = f.status === 'A' ? '➕' : f.status === 'D' ? '➖' : '📝';
      console.log(`   ${icon} ${f.path}`);
    });
    if (changed.files.length > 5) {
      console.log(`   ... and ${changed.files.length - 5} more files`);
    }
    console.log('');

    console.log('=== Demo Complete ===');
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is the Git MCP server running?');
      console.error('   Start it with: node examples/mcps/git-mcp-server.js');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
