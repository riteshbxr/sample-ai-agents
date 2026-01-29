/**
 * Git MCP Server
 * Provides Git operations: status, log, diff, branch management
 *
 * Usage: node examples/mcps/git-mcp-server.js
 * Then call via HTTP POST to http://localhost:3006/run
 */

import express from 'express';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());

// Configurable repository path (defaults to current working directory)
const REPO_PATH = process.env.GIT_REPO_PATH || process.cwd();

// Execute git command
function execGit(args, options = {}) {
  return new Promise((resolve, reject) => {
    const cwd = options.cwd || REPO_PATH;
    const child = spawn('git', args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `Git command failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Parse git status output
function parseStatus(output) {
  const lines = output.split('\n').filter((l) => l.trim());
  const files = {
    staged: [],
    modified: [],
    untracked: [],
    deleted: [],
  };

  for (const line of lines) {
    const status = line.slice(0, 2);
    const file = line.slice(3);

    if (status[0] === 'A' || status[0] === 'M' || status[0] === 'D') {
      files.staged.push({ status: status[0], file });
    }
    if (status[1] === 'M') {
      files.modified.push(file);
    }
    if (status[1] === 'D') {
      files.deleted.push(file);
    }
    if (status === '??') {
      files.untracked.push(file);
    }
  }

  return files;
}

// Parse git log output
function parseLog(output) {
  const commits = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const [hash, author, date, ...messageParts] = line.split('|');
    commits.push({
      hash: hash?.trim(),
      author: author?.trim(),
      date: date?.trim(),
      message: messageParts.join('|').trim(),
    });
  }

  return commits;
}

// Available methods
const methods = {
  // Get repository status
  async status() {
    const output = await execGit(['status', '--porcelain']);
    const branch = await execGit(['branch', '--show-current']);
    const files = parseStatus(output);

    return {
      branch,
      files,
      clean: Object.values(files).every((arr) => arr.length === 0),
    };
  },

  // Get commit log
  async log({ limit = 10, branch, author, since, until }) {
    const args = ['log', `--format=%H|%an|%ad|%s`, '--date=short', `-n${limit}`];

    if (branch) args.push(branch);
    if (author) args.push(`--author=${author}`);
    if (since) args.push(`--since=${since}`);
    if (until) args.push(`--until=${until}`);

    const output = await execGit(args);
    return { commits: parseLog(output) };
  },

  // Get diff
  async diff({ staged = false, file, commit }) {
    const args = ['diff'];

    if (staged) args.push('--staged');
    if (commit) args.push(commit);
    if (file) args.push('--', file);

    const output = await execGit(args);
    return { diff: output, lines: output.split('\n').length };
  },

  // List branches
  async branches({ all = false }) {
    const args = ['branch', '--format=%(refname:short)|%(objectname:short)|%(upstream:short)'];
    if (all) args.push('-a');

    const output = await execGit(args);
    const branches = output
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const [name, commit, upstream] = line.split('|');
        return { name, commit, upstream: upstream || null };
      });

    const current = await execGit(['branch', '--show-current']);
    return { branches, current };
  },

  // Show commit details
  async show({ commit = 'HEAD', stat = false }) {
    const args = ['show', commit, '--format=%H|%an|%ae|%ad|%s%n%b'];
    if (stat) args.push('--stat');

    const output = await execGit(args);
    const lines = output.split('\n');
    const [hash, author, email, date, ...rest] = lines[0].split('|');
    const body = rest.join('|');

    return {
      hash,
      author,
      email,
      date,
      subject: body.split('\n')[0],
      body: body.split('\n').slice(1).join('\n').trim(),
      changes: stat ? lines.slice(1).join('\n') : undefined,
    };
  },

  // Get file content at revision
  async show_file({ file, commit = 'HEAD' }) {
    const output = await execGit(['show', `${commit}:${file}`]);
    return { file, commit, content: output };
  },

  // List tags
  async tags({ limit = 20 }) {
    const output = await execGit(['tag', '-l', '--sort=-creatordate', `-n${limit}`]);
    const tags = output
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return { name: parts[0], message: parts.slice(1).join(' ') || null };
      });
    return { tags };
  },

  // Get blame for file
  async blame({ file, lines }) {
    const args = ['blame', '--porcelain'];
    if (lines) args.push(`-L${lines}`);
    args.push(file);

    const output = await execGit(args);
    return { file, blame: output };
  },

  // Search commits
  async search({ query, type = 'message' }) {
    const args = ['log', '--format=%H|%an|%ad|%s', '--date=short', '-n', '20'];

    if (type === 'message') {
      args.push(`--grep=${query}`);
    } else if (type === 'content') {
      args.push(`-S${query}`);
    } else if (type === 'author') {
      args.push(`--author=${query}`);
    }

    const output = await execGit(args);
    return { commits: parseLog(output), query, type };
  },

  // Get repository info
  async info() {
    const [remoteUrl, branch, lastCommit, commitCount] = await Promise.all([
      execGit(['remote', 'get-url', 'origin']).catch(() => 'N/A'),
      execGit(['branch', '--show-current']),
      execGit(['log', '-1', '--format=%H|%s']),
      execGit(['rev-list', '--count', 'HEAD']),
    ]);

    const [hash, message] = lastCommit.split('|');

    return {
      remoteUrl,
      currentBranch: branch,
      lastCommit: { hash, message },
      totalCommits: parseInt(commitCount, 10),
      repoPath: REPO_PATH,
    };
  },

  // List changed files between commits
  async changed_files({ from = 'HEAD~1', to = 'HEAD' }) {
    const output = await execGit(['diff', '--name-status', from, to]);
    const files = output
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const [status, ...pathParts] = line.split('\t');
        return { status, path: pathParts.join('\t') };
      });
    return { from, to, files };
  },

  // Get contributors
  async contributors() {
    const output = await execGit(['shortlog', '-sne', 'HEAD']);
    const contributors = output
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const match = line.trim().match(/^\s*(\d+)\s+(.+)\s+<(.+)>$/);
        if (match) {
          return { commits: parseInt(match[1], 10), name: match[2], email: match[3] };
        }
        return null;
      })
      .filter(Boolean);

    return { contributors };
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
app.get('/health', async (req, res) => {
  try {
    await execGit(['--version']);
    res.json({ status: 'ok', repoPath: REPO_PATH });
  } catch {
    res.status(500).json({ status: 'error', message: 'Git not available' });
  }
});

// List available methods
app.get('/methods', (req, res) => {
  res.json({ methods: Object.keys(methods) });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Git MCP server listening on http://localhost:${PORT}/run`);
  console.log(`Repository path: ${REPO_PATH}`);
  console.log(`Available methods: ${Object.keys(methods).join(', ')}`);
});
