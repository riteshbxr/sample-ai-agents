import { createAIClient } from '../../../clients/client-factory.js';
import { createLogger } from '../../../utils/logger.js';

/**
 * @typedef {Object} SearchResult
 * @property {string} title - Page title
 * @property {string} url - Page URL
 * @property {string} snippet - Text snippet from the page
 */

/**
 * @typedef {Object} WebSearchProvider
 * @property {function(string): Promise<SearchResult[]>} search - Search function
 * @property {function(string): Promise<string>} fetchPage - Fetch page content
 */

/**
 * Browser Search Agent - AI agent with web search and page reading capabilities
 *
 * This agent demonstrates the MCP (Model Context Protocol) pattern for browser/web access.
 * It can:
 * - Search the web for information
 * - Read and extract content from web pages
 * - Synthesize information from multiple sources
 *
 * In production, connect this to:
 * - MCP Browser Server (for full browser automation)
 * - Search APIs (Brave Search, Google Custom Search, Bing Search)
 * - Web scraping services
 */
export class BrowserSearchAgent {
  /**
   * Create a browser search agent
   * @param {'openai'|'claude'} [provider='openai'] - AI provider to use
   * @param {Object} [options] - Configuration options
   * @param {WebSearchProvider} [options.searchProvider] - Custom search provider
   * @param {import('../../../clients/ai-client-interface.js').AIClientInterface} [options.client] - Optional client instance
   */
  constructor(provider = 'openai', options = {}) {
    this.provider = provider;
    this.client = options.client || createAIClient(provider);
    this.logger = createLogger('BrowserSearchAgent');
    this.searchProvider = options.searchProvider || this._createMockSearchProvider();

    /** @type {import('../../../clients/ai-client-interface.js').ChatMessage[]} */
    this.conversationHistory = [];

    // Build tool definitions
    this.tools = this._buildToolDefinitions();
  }

  /**
   * Build tool definitions for web search capabilities
   * @private
   */
  _buildToolDefinitions() {
    const tools = [
      {
        name: 'web_search',
        description:
          'Search the web for information. Use this when you need to find current information, facts, or data from the internet.',
        ...(this.provider === 'openai'
          ? {
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query. Be specific and include relevant keywords.',
                  },
                  num_results: {
                    type: 'number',
                    description: 'Number of results to return (default: 5, max: 10)',
                  },
                },
                required: ['query'],
              },
            }
          : {
              input_schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query. Be specific and include relevant keywords.',
                  },
                  num_results: {
                    type: 'number',
                    description: 'Number of results to return (default: 5, max: 10)',
                  },
                },
                required: ['query'],
              },
            }),
      },
      {
        name: 'read_webpage',
        description:
          'Read and extract the main content from a webpage URL. Use this to get detailed information from a specific page found in search results.',
        ...(this.provider === 'openai'
          ? {
              parameters: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    description: 'The full URL of the webpage to read',
                  },
                },
                required: ['url'],
              },
            }
          : {
              input_schema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    description: 'The full URL of the webpage to read',
                  },
                },
                required: ['url'],
              },
            }),
      },
    ];

    return tools;
  }

  /**
   * Create a mock search provider for demonstration
   * Replace this with actual API calls in production
   * @private
   */
  _createMockSearchProvider() {
    // Mock search results database (simulates web search)
    const mockSearchDatabase = {
      'openai gpt-4': [
        {
          title: 'GPT-4 - OpenAI',
          url: 'https://openai.com/gpt-4',
          snippet:
            "GPT-4 is OpenAI's most advanced system, producing safer and more useful responses. It's a large multimodal model that can accept image and text inputs.",
        },
        {
          title: 'GPT-4 Technical Report - arXiv',
          url: 'https://arxiv.org/abs/2303.08774',
          snippet:
            'We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs and produce text outputs.',
        },
        {
          title: 'GPT-4 API Documentation',
          url: 'https://platform.openai.com/docs/models/gpt-4',
          snippet:
            'GPT-4 is a large multimodal model. It accepts both text and images as input. GPT-4 Turbo offers a 128K context window.',
        },
      ],
      'claude anthropic': [
        {
          title: 'Claude - Anthropic',
          url: 'https://www.anthropic.com/claude',
          snippet:
            "Claude is Anthropic's AI assistant, designed to be helpful, harmless, and honest. Available as Claude 3 Opus, Sonnet, and Haiku.",
        },
        {
          title: 'Claude 3 Model Card',
          url: 'https://www.anthropic.com/news/claude-3-family',
          snippet:
            "The Claude 3 family includes three models: Opus (most capable), Sonnet (balanced), and Haiku (fastest). They represent Anthropic's latest advances.",
        },
      ],
      'ai agents patterns': [
        {
          title: 'Building Effective AI Agents - Best Practices',
          url: 'https://example.com/ai-agents-guide',
          snippet:
            'AI agents combine LLMs with tools, memory, and planning capabilities. Key patterns include ReAct, Plan-and-Solve, and Multi-Agent collaboration.',
        },
        {
          title: 'Function Calling in LLMs - A Complete Guide',
          url: 'https://example.com/function-calling',
          snippet:
            'Function calling allows LLMs to use external tools. This enables agents to search the web, query databases, and interact with APIs.',
        },
      ],
      'mcp model context protocol': [
        {
          title: 'Model Context Protocol (MCP) - Anthropic',
          url: 'https://modelcontextprotocol.io/',
          snippet:
            'MCP is an open protocol that standardizes how applications provide context to LLMs. It enables AI assistants to connect with data sources and tools.',
        },
        {
          title: 'MCP Servers and Clients',
          url: 'https://modelcontextprotocol.io/docs/concepts/servers',
          snippet:
            'MCP servers expose resources and tools that AI applications can use. Common servers include filesystem, database, and browser automation.',
        },
        {
          title: 'Building MCP Servers - Guide',
          url: 'https://modelcontextprotocol.io/docs/guides/building-servers',
          snippet:
            'Learn how to build MCP servers that provide tools and resources to AI applications. Servers can be built in TypeScript, Python, or other languages.',
        },
      ],
      default: [
        {
          title: 'Search Results',
          url: 'https://example.com/search',
          snippet: 'No specific results found. Try a more specific search query.',
        },
      ],
    };

    // Mock page content database
    const mockPageContent = {
      'https://openai.com/gpt-4': `
# GPT-4

GPT-4 is OpenAI's most capable model for complex tasks.

## Key Features
- **Multimodal**: Accepts text and image inputs
- **Large Context**: Up to 128K tokens with GPT-4 Turbo
- **Improved Reasoning**: Better at math, coding, and analysis
- **Safety**: More aligned and less likely to produce harmful content

## Performance
GPT-4 passes the bar exam in the 90th percentile and scores highly on various academic benchmarks.

## Availability
Available through the OpenAI API and ChatGPT Plus.
      `,
      'https://www.anthropic.com/claude': `
# Claude

Claude is Anthropic's AI assistant focused on being helpful, harmless, and honest.

## Claude 3 Family
- **Opus**: Most capable, best for complex tasks
- **Sonnet**: Balanced performance and speed
- **Haiku**: Fastest, best for simple tasks

## Key Capabilities
- Long context window (200K tokens)
- Strong reasoning and analysis
- Code generation and review
- Creative writing and editing

## Constitutional AI
Claude is trained using Constitutional AI (CAI) to be helpful while avoiding harmful outputs.
      `,
      'https://modelcontextprotocol.io/': `
# Model Context Protocol (MCP)

MCP is an open protocol for connecting AI assistants to external data sources and tools.

## Why MCP?

MCP provides a standardized way for AI applications to:
- Access local files and databases
- Connect to external APIs
- Use browser automation
- Interact with development tools

## Architecture

MCP uses a client-server architecture:
- **Hosts**: AI applications that want to access context
- **Clients**: Protocol clients within hosts
- **Servers**: Lightweight programs that expose resources and tools

## Getting Started

Install an MCP server and configure your AI application to connect to it.
Common servers include:
- Filesystem server
- Database servers (PostgreSQL, SQLite)
- Browser automation
- Git integration
      `,
    };

    return {
      search: async (query) => {
        this.logger.info('Searching web', { query });

        // Find matching results
        const lowerQuery = query.toLowerCase();
        for (const [key, results] of Object.entries(mockSearchDatabase)) {
          if (
            key !== 'default' &&
            (lowerQuery.includes(key) || key.split(' ').some((word) => lowerQuery.includes(word)))
          ) {
            return results;
          }
        }

        return mockSearchDatabase.default;
      },

      fetchPage: async (url) => {
        this.logger.info('Fetching webpage', { url });

        // Check for mock content
        if (mockPageContent[url]) {
          return mockPageContent[url];
        }

        // Return generic content for unknown URLs
        return `
# Page Content

This is a placeholder for the content at ${url}.

In production, this would contain the actual extracted content from the webpage.
        `;
      },
    };
  }

  /**
   * Execute a tool call
   * @private
   * @param {string} toolName - Name of the tool
   * @param {Object} args - Tool arguments
   * @returns {Promise<string>} Tool result as string
   */
  async _executeTool(toolName, args) {
    switch (toolName) {
      case 'web_search': {
        const results = await this.searchProvider.search(args.query);
        const numResults = Math.min(args.num_results || 5, 10);
        const limitedResults = results.slice(0, numResults);

        return JSON.stringify(
          {
            query: args.query,
            results: limitedResults,
            total: limitedResults.length,
          },
          null,
          2
        );
      }

      case 'read_webpage': {
        const content = await this.searchProvider.fetchPage(args.url);
        return JSON.stringify(
          {
            url: args.url,
            content: content.trim(),
            fetched_at: new Date().toISOString(),
          },
          null,
          2
        );
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  }

  /**
   * Chat with the agent
   * @param {string} userMessage - User's message
   * @param {Object} [options] - Chat options
   * @param {number} [options.maxIterations=10] - Maximum tool call iterations
   * @returns {Promise<string>} Agent's response
   */
  async chat(userMessage, options = {}) {
    const maxIterations = options.maxIterations || 10;

    // Add system message if this is first message
    if (this.conversationHistory.length === 0) {
      const systemPrompt = `You are a helpful AI assistant with web search capabilities.

You have access to two tools:
1. web_search - Search the web for information
2. read_webpage - Read the content of a specific webpage

When answering questions:
- Search for current information when needed
- Read relevant webpages to get detailed information
- Synthesize information from multiple sources
- Always cite your sources with URLs
- If you can't find information, say so honestly

Be thorough but concise in your responses.`;

      if (this.provider === 'claude') {
        // Claude uses system parameter separately
        this.systemPrompt = systemPrompt;
      } else {
        this.conversationHistory.push({
          role: 'system',
          content: systemPrompt,
        });
      }
    }

    // Add user message
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Make API call with tools
      const response = await this.client.chatWithTools(
        this.conversationHistory,
        this.tools,
        this.provider === 'claude' ? { system: this.systemPrompt } : {}
      );

      // Check for tool use
      if (this.client.hasToolUse(response)) {
        const toolBlocks = this.client.getToolUseBlocks(response);
        const toolResults = [];

        for (const block of toolBlocks) {
          let toolName, toolArgs;

          // Handle OpenAI format
          if (block.function) {
            toolName = block.function.name;
            toolArgs = JSON.parse(block.function.arguments);
          }
          // Handle Claude format
          else {
            toolName = block.name;
            toolArgs = block.input;
          }

          console.log(`\n🔧 [Tool: ${toolName}]`);
          if (toolName === 'web_search') {
            console.log(`   Query: "${toolArgs.query}"`);
          } else if (toolName === 'read_webpage') {
            console.log(`   URL: ${toolArgs.url}`);
          }

          const result = await this._executeTool(toolName, toolArgs);

          // Format result based on provider
          if (this.provider === 'openai') {
            toolResults.push({
              role: 'tool',
              tool_call_id: block.id,
              content: result,
            });
          } else {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result,
            });
          }
        }

        // Add assistant message and tool results
        if (this.provider === 'openai') {
          const message = response.choices?.[0]?.message || {
            role: 'assistant',
            content: this.client.getTextContent(response),
          };
          this.conversationHistory.push(message);
          this.conversationHistory.push(...toolResults);
        } else {
          this.conversationHistory.push({
            role: 'assistant',
            content: response.content,
          });
          this.conversationHistory.push({
            role: 'user',
            content: toolResults,
          });
        }

        continue;
      }

      // No tool use - return final response
      const textContent = this.client.getTextContent(response);

      // Add to history
      if (this.provider === 'openai') {
        const message = response.choices?.[0]?.message || {
          role: 'assistant',
          content: textContent,
        };
        this.conversationHistory.push(message);
      } else {
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });
      }

      return textContent;
    }

    throw new Error(`Maximum iterations (${maxIterations}) exceeded`);
  }

  /**
   * Reset the conversation
   */
  resetConversation() {
    this.conversationHistory = [];
    this.systemPrompt = null;
  }
}

/**
 * Create a search provider that uses the Brave Search API directly
 *
 * This provider calls the Brave Search API without requiring a separate MCP server.
 *
 * SETUP:
 * 1. Get a free API key from: https://brave.com/search/api/
 * 2. Set the environment variable: export BRAVE_API_KEY=your_key
 *
 * @param {Object} [config] - Configuration options
 * @param {string} [config.apiKey] - Brave API key (defaults to BRAVE_API_KEY env var)
 * @returns {WebSearchProvider} Search provider
 */
export function createBraveSearchProvider(config = {}) {
  const apiKey = config.apiKey || process.env.BRAVE_API_KEY;

  if (!apiKey) {
    throw new Error('BRAVE_API_KEY is required. Get a free key at: https://brave.com/search/api/');
  }

  const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

  return {
    search: async (query) => {
      const url = `${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=10`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brave API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      return (
        data.web?.results?.map((r) => ({
          title: r.title || '',
          url: r.url || '',
          snippet: r.description || '',
        })) || []
      );
    },

    fetchPage: async (url) => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BraveSearchBot/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status}`);
      }

      const html = await response.text();

      // Basic HTML to text extraction
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 10000);
    },
  };
}

/**
 * Create a search provider that uses the local Playwright MCP server
 *
 * This provider connects to the Playwright MCP server running at localhost:3001.
 * Start the server first with: npm run demo:playwright-mcp:start
 *
 * The Playwright server performs real browser-based searches using Google or Bing.
 *
 * @param {Object} [config] - Configuration options
 * @param {string} [config.baseUrl='http://localhost:3001'] - Playwright MCP server URL
 * @param {string} [config.engine='google'] - Search engine ('google' or 'bing')
 * @param {boolean} [config.headless=true] - Run browser in headless mode
 * @returns {WebSearchProvider} Search provider
 */
export function createPlaywrightSearchProvider(config = {}) {
  const baseUrl = config.baseUrl || 'http://localhost:3001';
  const engine = config.engine || 'google';
  const headless = config.headless !== false;

  return {
    search: async (query) => {
      const response = await fetch(`${baseUrl}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'search',
          params: {
            query,
            engine,
            headless,
            maxResults: 10,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Playwright MCP server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Playwright search failed: ${data.error || 'Unknown error'}`);
      }

      return (
        data.results?.map((r) => ({
          title: r.title,
          url: r.href,
          snippet: r.snippet || '',
        })) || []
      );
    },

    fetchPage: async (url) => {
      // Playwright MCP server doesn't support page fetch yet
      // Fall back to basic fetch
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PlaywrightBot/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status}`);
      }

      const html = await response.text();

      // Basic HTML to text extraction
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 10000);
    },
  };
}
