/**
 * Batch Processor
 * Processes multiple items efficiently with concurrency control
 */
export class BatchProcessor {
  constructor(client, concurrency = 5) {
    this.client = client;
    this.concurrency = concurrency;
  }

  /**
   * Process items in parallel with concurrency limit
   */
  async processBatch(items, processorFn) {
    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i += this.concurrency) {
      const batch = items.slice(i, i + this.concurrency);

      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await processorFn(item);
          return { success: true, item, result, index: i + index };
        } catch (error) {
          return { success: false, item, error: error.message, index: i + index };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((result) => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });

      // Progress indicator
      const processed = Math.min(i + this.concurrency, items.length);
      console.log(`  Processed ${processed}/${items.length} items...`);
    }

    return { results, errors };
  }

  /**
   * Process with retry logic
   */
  async processWithRetry(items, processorFn, maxRetries = 3) {
    const results = [];
    const failed = [];

    for (const item of items) {
      let lastError;
      let success = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await processorFn(item);
          results.push({ item, result });
          success = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            await this.sleep(1000 * attempt); // Exponential backoff
          }
        }
      }

      if (!success) {
        failed.push({ item, error: lastError.message });
      }
    }

    return { results, failed };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
