import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ResponseCache } from '../../src/examples/strategies/caching/response-cache.js';

describe('ResponseCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ResponseCache(1000); // 1 second TTL for testing
  });

  describe('constructor', () => {
    it('should initialize with default TTL', () => {
      const defaultCache = new ResponseCache();
      assert.strictEqual(defaultCache.ttl, 3600000); // 1 hour
    });

    it('should accept custom TTL', () => {
      assert.strictEqual(cache.ttl, 1000);
    });

    it('should initialize empty cache and stats', () => {
      assert.strictEqual(cache.cache.size, 0);
      assert.deepStrictEqual(cache.stats, {
        hits: 0,
        misses: 0,
        evictions: 0,
      });
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same messages', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const key1 = cache.generateKey(messages);
      const key2 = cache.generateKey(messages);
      assert.strictEqual(key1, key2);
    });

    it('should generate different keys for different messages', () => {
      const key1 = cache.generateKey([{ role: 'user', content: 'Hello' }]);
      const key2 = cache.generateKey([{ role: 'user', content: 'World' }]);
      assert.notStrictEqual(key1, key2);
    });

    it('should include model in key generation', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const key1 = cache.generateKey(messages, { model: 'gpt-4' });
      const key2 = cache.generateKey(messages, { model: 'gpt-3.5' });
      assert.notStrictEqual(key1, key2);
    });

    it('should include temperature in key generation', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const key1 = cache.generateKey(messages, { temperature: 0.5 });
      const key2 = cache.generateKey(messages, { temperature: 0.9 });
      assert.notStrictEqual(key1, key2);
    });

    it('should normalize messages (remove extra properties)', () => {
      const messages1 = [{ role: 'user', content: 'Hello', timestamp: 123 }];
      const messages2 = [{ role: 'user', content: 'Hello', timestamp: 456 }];
      const key1 = cache.generateKey(messages1);
      const key2 = cache.generateKey(messages2);
      assert.strictEqual(key1, key2);
    });

    it('should return SHA256 hash', () => {
      const key = cache.generateKey([{ role: 'user', content: 'Test' }]);
      assert.strictEqual(key.length, 64); // SHA256 produces 64 hex characters
      assert.ok(/^[a-f0-9]+$/.test(key));
    });
  });

  describe('set and get', () => {
    it('should store and retrieve response', () => {
      const key = 'test-key';
      const response = { content: 'Test response' };

      cache.set(key, response);
      const retrieved = cache.get(key);

      assert.deepStrictEqual(retrieved, response);
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');
      assert.strictEqual(result, null);
    });

    it('should increment hits on cache hit', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');

      assert.strictEqual(cache.stats.hits, 2);
    });

    it('should increment misses on cache miss', () => {
      cache.get('missing1');
      cache.get('missing2');

      assert.strictEqual(cache.stats.misses, 2);
    });
  });

  describe('TTL expiration', () => {
    it('should return null for expired entries', async () => {
      const shortCache = new ResponseCache(50); // 50ms TTL
      shortCache.set('key', 'value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = shortCache.get('key');
      assert.strictEqual(result, null);
    });

    it('should increment evictions on expiration', async () => {
      const shortCache = new ResponseCache(50);
      shortCache.set('key', 'value');

      await new Promise((resolve) => setTimeout(resolve, 100));
      shortCache.get('key');

      assert.strictEqual(shortCache.stats.evictions, 1);
      assert.strictEqual(shortCache.stats.misses, 1);
    });

    it('should return value before expiration', async () => {
      const shortCache = new ResponseCache(500);
      shortCache.set('key', 'value');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = shortCache.get('key');
      assert.strictEqual(result, 'value');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      assert.strictEqual(cache.cache.size, 0);
    });

    it('should reset stats', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('missing');

      cache.clear();

      assert.deepStrictEqual(cache.stats, {
        hits: 0,
        misses: 0,
        evictions: 0,
      });
    });
  });

  describe('getStats', () => {
    it('should return correct hit rate', () => {
      cache.set('key', 'value');
      cache.get('key'); // hit
      cache.get('key'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();
      assert.strictEqual(stats.hits, 2);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.hitRate, '66.67%');
    });

    it('should return 0% hit rate when no requests', () => {
      const stats = cache.getStats();
      assert.strictEqual(stats.hitRate, '0%');
    });

    it('should return 100% hit rate when all hits', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');

      const stats = cache.getStats();
      assert.strictEqual(stats.hitRate, '100.00%');
    });

    it('should include cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      assert.strictEqual(stats.size, 2);
    });

    it('should include evictions count', () => {
      const stats = cache.getStats();
      assert.strictEqual(stats.evictions, 0);
    });
  });

  describe('integration tests', () => {
    it('should work with full message workflow', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ];
      const options = { model: 'gpt-4', temperature: 0.7 };

      const key = cache.generateKey(messages, options);
      const response = {
        id: 'test-id',
        choices: [{ message: { content: 'Hi there!' } }],
      };

      cache.set(key, response);
      const retrieved = cache.get(key);

      assert.deepStrictEqual(retrieved, response);
    });

    it('should handle multiple entries correctly', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      assert.strictEqual(cache.cache.size, 10);

      for (let i = 0; i < 10; i++) {
        assert.strictEqual(cache.get(`key-${i}`), `value-${i}`);
      }
    });

    it('should handle overwriting existing keys', () => {
      cache.set('key', 'original');
      cache.set('key', 'updated');

      assert.strictEqual(cache.get('key'), 'updated');
      assert.strictEqual(cache.cache.size, 1);
    });
  });
});
