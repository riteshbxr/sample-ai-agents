/**
 * Cached AI Client wrapper
 * Wraps AI clients with caching functionality
 */
export class CachedAIClient {
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
