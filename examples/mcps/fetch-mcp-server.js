/**
 * Fetch MCP Server
 * Provides HTTP fetching capabilities: GET, POST, web scraping
 *
 * Usage: node examples/mcps/fetch-mcp-server.js
 * Then call via HTTP POST to http://localhost:3003/run
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Default headers for requests
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; FetchMCP/1.0; +https://modelcontextprotocol.io)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// Available methods
const methods = {
  // Basic HTTP GET
  async fetch({ url, headers = {}, timeout = 30000 }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { ...DEFAULT_HEADERS, ...headers },
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      let body;

      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      return {
        url,
        status: response.status,
        statusText: response.statusText,
        contentType,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        bodyLength: typeof body === 'string' ? body.length : JSON.stringify(body).length,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // HTTP POST with body
  async post({ url, body, contentType = 'application/json', headers = {}, timeout = 30000 }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestBody = contentType.includes('json') ? JSON.stringify(body) : body;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': contentType,
          ...headers,
        },
        body: requestBody,
        signal: controller.signal,
      });

      const responseContentType = response.headers.get('content-type') || '';
      let responseBody;

      if (responseContentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return {
        url,
        status: response.status,
        statusText: response.statusText,
        contentType: responseContentType,
        body: responseBody,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // Fetch and extract text content (simplified web scraping)
  async fetch_text({ url, selector: _selector = 'body', headers = {}, timeout = 30000 }) {
    const result = await methods.fetch({ url, headers, timeout });

    if (typeof result.body !== 'string') {
      return { url, text: JSON.stringify(result.body), contentType: 'application/json' };
    }

    // Simple HTML to text conversion
    let text = result.body;

    // Remove script and style tags
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return {
      url,
      text,
      textLength: text.length,
      originalLength: result.body.length,
    };
  },

  // Extract links from a page
  async extract_links({ url, headers = {}, timeout = 30000 }) {
    const result = await methods.fetch({ url, headers, timeout });

    if (typeof result.body !== 'string') {
      return { url, links: [], count: 0 };
    }

    // Extract href attributes
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
    const links = [];
    let match;

    while ((match = linkRegex.exec(result.body)) !== null) {
      let href = match[2];

      // Convert relative URLs to absolute
      if (href.startsWith('/')) {
        const urlObj = new URL(url);
        href = `${urlObj.protocol}//${urlObj.host}${href}`;
      } else if (!href.startsWith('http')) {
        continue; // Skip non-http links
      }

      if (!links.includes(href)) {
        links.push(href);
      }
    }

    return {
      url,
      links,
      count: links.length,
    };
  },

  // Extract metadata from a page (title, description, etc.)
  async extract_metadata({ url, headers = {}, timeout = 30000 }) {
    const result = await methods.fetch({ url, headers, timeout });

    if (typeof result.body !== 'string') {
      return { url, metadata: {} };
    }

    const html = result.body;
    const metadata = {};

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = titleMatch[1].trim();

    // Meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) metadata.description = descMatch[1].trim();

    // Meta keywords
    const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    if (keywordsMatch) metadata.keywords = keywordsMatch[1].trim();

    // Open Graph tags
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
    for (const tag of ogTags) {
      const regex = new RegExp(`<meta\\s+property=["']${tag}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      if (match) metadata[tag.replace(':', '_')] = match[1].trim();
    }

    // Twitter cards
    const twitterMatch = html.match(
      /<meta\s+name=["']twitter:card["']\s+content=["']([^"']+)["']/i
    );
    if (twitterMatch) metadata.twitter_card = twitterMatch[1].trim();

    // Canonical URL
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (canonicalMatch) metadata.canonical = canonicalMatch[1].trim();

    return {
      url,
      metadata,
    };
  },

  // Check if URL is accessible (HEAD request)
  async check_url({ url, headers = {}, timeout = 10000 }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { ...DEFAULT_HEADERS, ...headers },
        signal: controller.signal,
      });

      return {
        url,
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      };
    } catch (error) {
      return {
        url,
        accessible: false,
        error: error.message,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // Fetch JSON API
  async fetch_json({ url, headers = {}, timeout = 30000 }) {
    const result = await methods.fetch({
      url,
      headers: { ...headers, Accept: 'application/json' },
      timeout,
    });

    return {
      url,
      status: result.status,
      data: typeof result.body === 'string' ? JSON.parse(result.body) : result.body,
    };
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

  if (!params?.url && method !== 'post') {
    return res.status(400).json({
      ok: false,
      error: 'Missing required parameter: url',
    });
  }

  try {
    const result = await methods[method](params || {});
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      name: err.name,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List available methods
app.get('/methods', (req, res) => {
  res.json({ methods: Object.keys(methods) });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Fetch MCP server listening on http://localhost:${PORT}/run`);
  console.log(`Available methods: ${Object.keys(methods).join(', ')}`);
});
