/**
 * Rate Limited Processor
 * Processes items with rate limiting to avoid API throttling
 */
export class RateLimitedProcessor {
  constructor(client, requestsPerSecond = 2) {
    this.client = client;
    this.requestsPerSecond = requestsPerSecond;
    this.queue = [];
    this.processing = false;
  }

  async process(item, processorFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, processorFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { item, processorFn, resolve, reject } = this.queue.shift();

      try {
        const result = await processorFn(item);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Wait before next request
      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 / this.requestsPerSecond));
      }
    }

    this.processing = false;
  }
}
