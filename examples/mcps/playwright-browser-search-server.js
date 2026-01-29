import express from 'express';
import { chromium } from 'playwright';

const app = express();
app.use(express.json());

// Basic in-memory browser context pool (single browser instance)
let browserInstance = null;
async function getBrowser(headless = true) {
  if (browserInstance) return browserInstance;
  browserInstance = await chromium.launch({ headless });
  return browserInstance;
}

app.post('/run', async (req, res) => {
  const { method, params } = req.body || {};
  if (method !== 'search') return res.status(400).json({ error: 'unsupported method' });
  const { query, engine = 'google', headless = true, maxResults = 5 } = params || {};
  if (!query) return res.status(400).json({ error: 'missing query' });

  const browser = await getBrowser(headless);
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; PlaywrightBot/1.0)',
  });
  const page = await context.newPage();
  try {
    const url =
      engine === 'bing'
        ? `https://www.bing.com/search?q=${encodeURIComponent(query)}`
        : `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Allow some time for JS-rendered snippets
    await page.waitForTimeout(700);

    /* eslint-disable no-undef */
    const results = await page.evaluate((maxK) => {
      const out = [];
      // Try Google-style results first
      const googleNodes = Array.from(document.querySelectorAll('div.g'));
      for (const n of googleNodes) {
        if (out.length >= maxK) break;
        const a = n.querySelector('a');
        const title = a
          ? a.querySelector('h3')?.innerText || a.innerText
          : n.querySelector('h3')?.innerText || '';
        const href = a?.href || '';
        const snippet = (n.querySelector('.VwiC3b') || n.querySelector('.IsZvec'))?.innerText || '';
        if (title && href) out.push({ title: title.trim(), href, snippet: snippet.trim() });
      }
      // Bing-style results
      if (out.length < maxK) {
        const bingNodes = Array.from(document.querySelectorAll('li.b_algo'));
        for (const n of bingNodes) {
          if (out.length >= maxK) break;
          const a = n.querySelector('a');
          const title = a?.innerText || n.querySelector('h2')?.innerText || '';
          const href = a?.href || '';
          const snippet = n.querySelector('.b_caption p')?.innerText || '';
          if (title && href) out.push({ title: title.trim(), href, snippet: snippet.trim() });
        }
      }
      // Fallback: generic links
      if (out.length === 0) {
        const links = Array.from(document.querySelectorAll('a'));
        for (const a of links) {
          if (out.length >= maxK) break;
          const title = a.innerText.trim();
          const href = a.href || '';
          if (title && href && href.startsWith('http')) out.push({ title, href, snippet: '' });
        }
      }
      return out.slice(0, maxK);
    }, maxResults);
    /* eslint-enable no-undef */

    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  } finally {
    await page.close();
    await context.close();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'playwright-browser-search' });
});

// Graceful shutdown: close browser when process exits
process.on('SIGINT', async () => {
  try {
    if (browserInstance) await browserInstance.close();
  } catch (e) {
    // ignore
  } finally {
    process.exit();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Playwright MCP server listening on http://localhost:${PORT}/run`);
});
