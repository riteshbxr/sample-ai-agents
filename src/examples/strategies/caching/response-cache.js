import crypto from 'crypto';

/**
 * Response Cache
 * Caches AI responses to reduce costs and improve latency
 */
export class ResponseCache {
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
