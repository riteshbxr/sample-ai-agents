import { ResponseCache } from './response-cache.js';

/**
 * Smart Cache
 * Cache with intelligent invalidation rules
 */
export class SmartCache extends ResponseCache {
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
