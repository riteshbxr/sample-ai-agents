import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';
import crypto from 'crypto';

/**
 * Response Caching Example
 * Demonstrates caching strategies to reduce costs and improve latency
 */
class ResponseCache {
  constructor(ttl = 3600000) {
    // 1 hour default TTL
    this.cache = new Map();
    this.ttl = ttl;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Generate cache key from messages
   */
  generateKey(messages, options = {}) {
    // Normalize messages (remove timestamps, etc.)
    const normalized = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const keyData = JSON.stringify({
      messages: normalized,
      model: options.model || 'default',
      temperature: options.temperature || 0.7,
    });

    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Get cached response
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    this.stats.hits++;
    return entry.response;
  }

  /**
   * Set cached response
   */
  set(key, response) {
    this.cache.set(key, {
      response,
      expiresAt: Date.now() + this.ttl,
      cachedAt: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
    };
  }
}

/**
 * Cached AI Client wrapper
 */
class CachedAIClient {
  constructor(client, cache) {
    this.client = client;
    this.cache = cache;
  }

  async chat(messages, options = {}) {
    const key = this.cache.generateKey(messages, options);

    // Check cache
    const cached = this.cache.get(key);
    if (cached) {
      console.log('  💾 Cache HIT');
      return cached;
    }

    // Cache miss - make API call
    console.log('  🔄 Cache MISS - calling API');
    const response = await this.client.chat(messages, options);

    // Cache the response
    this.cache.set(key, response);

    return response;
  }

  async chatStream(messages, onChunk, options = {}) {
    // Streaming responses typically shouldn't be cached
    // But we can cache the final result if needed
    return await this.client.chatStream(messages, onChunk, options);
  }
}

async function cachingExample() {
  console.log('=== Response Caching Example ===\n');

  // Example 1: Basic Caching
  console.log('1️⃣ Basic Response Caching:');
  console.log('-'.repeat(60));

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('azure-openai');
    const cache = new ResponseCache(60000); // 1 minute TTL for demo
    const cachedClient = new CachedAIClient(openaiClient, cache);

    const messages = [{ role: 'user', content: 'What is machine learning?' }];

    console.log('First request (cache miss):');
    const start1 = Date.now();
    const response1 = await cachedClient.chat(messages);
    const time1 = Date.now() - start1;
    console.log(`   Time: ${time1}ms`);
    console.log(`   Response: ${response1.choices[0].message.content.substring(0, 80)}...\n`);

    console.log('Second request (cache hit):');
    const start2 = Date.now();
    const response2 = await cachedClient.chat(messages);
    const time2 = Date.now() - start2;
    console.log(`   Time: ${time2}ms`);
    console.log(`   Response: ${response2.choices[0].message.content.substring(0, 80)}...\n`);

    console.log(`⚡ Speed improvement: ${(((time1 - time2) / time1) * 100).toFixed(1)}% faster`);
    console.log(`💰 Cost saved: 1 API call avoided\n`);
  }

  console.log('\n');

  // Example 2: Cache Statistics
  console.log('2️⃣ Cache Statistics:');
  console.log('-'.repeat(60));

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('azure-openai');
    const cache = new ResponseCache(60000);
    const cachedClient = new CachedAIClient(openaiClient, cache);

    const queries = [
      'What is AI?',
      'What is machine learning?',
      'What is AI?', // Duplicate
      'What is deep learning?',
      'What is machine learning?', // Duplicate
      'What is neural networks?',
    ];

    console.log('Making multiple requests...\n');

    for (const query of queries) {
      await cachedClient.chat([{ role: 'user', content: query }]);
    }

    const stats = cache.getStats();
    console.log('Cache Statistics:');
    console.log(`  Hits: ${stats.hits}`);
    console.log(`  Misses: ${stats.misses}`);
    console.log(`  Hit Rate: ${stats.hitRate}`);
    console.log(`  Cache Size: ${stats.size} entries`);
    console.log(`  Evictions: ${stats.evictions}`);
  }

  console.log('\n');

  // Example 3: Cache Invalidation Strategies
  console.log('3️⃣ Cache Invalidation Strategies:');
  console.log('-'.repeat(60));

  class SmartCache extends ResponseCache {
    constructor(ttl, invalidationRules = {}) {
      super(ttl);
      this.invalidationRules = invalidationRules;
    }

    shouldInvalidate(key, newMessages) {
      // Invalidate if messages contain time-sensitive keywords
      const timeSensitiveKeywords = ['today', 'now', 'current', 'latest', 'recent'];
      const messageText = JSON.stringify(newMessages).toLowerCase();

      return timeSensitiveKeywords.some((keyword) => messageText.includes(keyword));
    }

    get(key, newMessages = null) {
      if (newMessages && this.shouldInvalidate(key, newMessages)) {
        this.cache.delete(key);
        this.stats.evictions++;
        this.stats.misses++;
        return null;
      }

      return super.get(key);
    }
  }

  const smartCache = new SmartCache(60000);

  console.log('Cache invalidation rules:');
  console.log('  - Time-sensitive queries (today, now, current) bypass cache');
  console.log('  - Static queries (definitions, explanations) use cache\n');

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('azure-openai');
    const cachedClient = new CachedAIClient(openaiClient, smartCache);

    // Static query - should cache
    console.log('Static query (cacheable):');
    await cachedClient.chat([{ role: 'user', content: 'What is artificial intelligence?' }]);
    await cachedClient.chat([{ role: 'user', content: 'What is artificial intelligence?' }]);

    // Time-sensitive query - should not cache
    console.log('\nTime-sensitive query (not cacheable):');
    await cachedClient.chat([{ role: 'user', content: 'What is the weather today?' }]);
    await cachedClient.chat([{ role: 'user', content: 'What is the weather today?' }]);
  }

  console.log('\n');

  // Example 4: Cost Savings Calculation
  console.log('4️⃣ Cost Savings Calculation:');
  console.log('-'.repeat(60));

  function calculateSavings(cacheStats, avgCostPerRequest = 0.01) {
    const savedRequests = cacheStats.hits;
    const totalCost = (cacheStats.hits + cacheStats.misses) * avgCostPerRequest;
    const savedCost = savedRequests * avgCostPerRequest;
    const savingsPercent = ((savedCost / totalCost) * 100).toFixed(2);

    return {
      savedRequests,
      savedCost: `$${savedCost.toFixed(4)}`,
      totalCost: `$${totalCost.toFixed(4)}`,
      savingsPercent: `${savingsPercent}%`,
    };
  }

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const cache = new ResponseCache();
    const openaiClient = createAIClient('azure-openai');
    const cachedClient = new CachedAIClient(openaiClient, cache);

    // Simulate 100 requests with 30% cache hit rate
    const commonQueries = ['What is AI?', 'What is machine learning?', 'What is deep learning?'];

    for (let i = 0; i < 100; i++) {
      const query = commonQueries[Math.floor(Math.random() * commonQueries.length)];
      await cachedClient.chat([{ role: 'user', content: query }]);
    }

    const stats = cache.getStats();
    const savings = calculateSavings(stats, 0.01);

    console.log('Cost Savings Analysis:');
    console.log(`  Total Requests: ${stats.hits + stats.misses}`);
    console.log(`  Cache Hits: ${stats.hits}`);
    console.log(`  Cache Misses: ${stats.misses}`);
    console.log(`  Hit Rate: ${stats.hitRate}`);
    console.log(`  Saved Requests: ${savings.savedRequests}`);
    console.log(`  Total Cost: ${savings.totalCost}`);
    console.log(`  Saved Cost: ${savings.savedCost}`);
    console.log(`  Savings: ${savings.savingsPercent}`);
  }

  console.log('\n💡 Caching Best Practices:');
  console.log('-'.repeat(60));
  console.log('1. Cache static content (definitions, explanations)');
  console.log("2. Don't cache time-sensitive queries (weather, news)");
  console.log('3. Use appropriate TTL based on content type');
  console.log('4. Implement cache invalidation for dynamic content');
  console.log('5. Monitor cache hit rates and adjust strategy');
  console.log('6. Consider cache size limits for memory management');
  console.log('7. Use distributed caching for multi-instance deployments');
  console.log('8. Cache at multiple levels (application, CDN, database)');
}

cachingExample().catch(console.error);
