import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BatchProcessor } from '../../src/examples/strategies/batch/batch-processor.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

describe('BatchProcessor', () => {
  let processor;
  let mockClient;

  beforeEach(() => {
    mockClient = new MockAIClient({ defaultResponse: 'Test response' });
    processor = new BatchProcessor(mockClient, 2); // Concurrency of 2
  });

  describe('constructor', () => {
    it('should initialize with client and default concurrency', () => {
      const defaultProcessor = new BatchProcessor(mockClient);
      assert.strictEqual(defaultProcessor.concurrency, 5);
    });

    it('should accept custom concurrency', () => {
      assert.strictEqual(processor.concurrency, 2);
    });

    it('should store client reference', () => {
      assert.strictEqual(processor.client, mockClient);
    });
  });

  describe('processBatch', () => {
    it('should process all items successfully', async () => {
      const items = ['a', 'b', 'c'];
      const processorFn = async (item) => item.toUpperCase();

      const { results, errors } = await processor.processBatch(items, processorFn);

      assert.strictEqual(results.length, 3);
      assert.strictEqual(errors.length, 0);
      assert.strictEqual(results[0].result, 'A');
      assert.strictEqual(results[1].result, 'B');
      assert.strictEqual(results[2].result, 'C');
    });

    it('should handle errors without stopping', async () => {
      const items = [1, 2, 3, 4];
      const processorFn = async (item) => {
        if (item === 2) throw new Error('Error on 2');
        return item * 2;
      };

      const { results, errors } = await processor.processBatch(items, processorFn);

      assert.strictEqual(results.length, 3);
      assert.strictEqual(errors.length, 1);
      assert.strictEqual(errors[0].error, 'Error on 2');
    });

    it('should respect concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const items = [1, 2, 3, 4, 5];
      const processorFn = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrent--;
        return 'done';
      };

      await processor.processBatch(items, processorFn);

      assert.ok(maxConcurrent <= 2, `Max concurrent was ${maxConcurrent}, expected <= 2`);
    });

    it('should include item index in results', async () => {
      const items = ['a', 'b', 'c'];
      const processorFn = async (item) => item;

      const { results } = await processor.processBatch(items, processorFn);

      assert.strictEqual(results[0].index, 0);
      assert.strictEqual(results[1].index, 1);
      assert.strictEqual(results[2].index, 2);
    });

    it('should include original item in results', async () => {
      const items = ['x', 'y', 'z'];
      const processorFn = async (item) => item.toUpperCase();

      const { results } = await processor.processBatch(items, processorFn);

      assert.strictEqual(results[0].item, 'x');
      assert.strictEqual(results[0].result, 'X');
    });

    it('should handle empty items array', async () => {
      const { results, errors } = await processor.processBatch([], async () => {});

      assert.strictEqual(results.length, 0);
      assert.strictEqual(errors.length, 0);
    });

    it('should handle single item', async () => {
      const { results, errors } = await processor.processBatch(['single'], async (item) => item);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(errors.length, 0);
      assert.strictEqual(results[0].result, 'single');
    });
  });

  describe('processWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const items = ['a', 'b'];
      const processorFn = async (item) => item.toUpperCase();

      const { results, failed } = await processor.processWithRetry(items, processorFn);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(failed.length, 0);
    });

    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      const items = ['test'];
      const processorFn = async (item) => {
        attempts++;
        if (attempts < 2) throw new Error('Temporary failure');
        return item;
      };

      const { results, failed } = await processor.processWithRetry(items, processorFn);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(failed.length, 0);
      assert.strictEqual(attempts, 2);
    });

    it('should fail after max retries', async () => {
      const items = ['fail'];
      const processorFn = async () => {
        throw new Error('Persistent failure');
      };

      const { results, failed } = await processor.processWithRetry(items, processorFn, 2);

      assert.strictEqual(results.length, 0);
      assert.strictEqual(failed.length, 1);
      assert.strictEqual(failed[0].error, 'Persistent failure');
    });

    it('should use exponential backoff', async () => {
      const timestamps = [];
      const items = ['test'];
      const processorFn = async () => {
        timestamps.push(Date.now());
        throw new Error('fail');
      };

      await processor.processWithRetry(items, processorFn, 3);

      // Check that delays increase (allowing some tolerance)
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        // Second delay should be roughly 2x first delay
        assert.ok(delay2 > delay1 * 1.5, 'Backoff should be exponential');
      }
    });

    it('should process multiple items independently', async () => {
      let failCount = 0;
      const items = ['success', 'fail-once', 'fail-always'];

      const processorFn = async (item) => {
        if (item === 'fail-once' && failCount === 0) {
          failCount++;
          throw new Error('temp');
        }
        if (item === 'fail-always') {
          throw new Error('permanent');
        }
        return item.toUpperCase();
      };

      const { results, failed } = await processor.processWithRetry(items, processorFn, 2);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(failed.length, 1);
      assert.strictEqual(failed[0].item, 'fail-always');
    });

    it('should handle empty items array', async () => {
      const { results, failed } = await processor.processWithRetry([], async () => {});

      assert.strictEqual(results.length, 0);
      assert.strictEqual(failed.length, 0);
    });
  });

  describe('sleep', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await processor.sleep(100);
      const elapsed = Date.now() - start;

      assert.ok(elapsed >= 90, `Sleep was too short: ${elapsed}ms`);
      assert.ok(elapsed < 200, `Sleep was too long: ${elapsed}ms`);
    });
  });

  describe('integration with MockAIClient', () => {
    it('should process AI requests in batch', async () => {
      const prompts = ['Hello', 'World', 'Test'];

      const processorFn = async (prompt) => {
        const response = await mockClient.chat([{ role: 'user', content: prompt }]);
        return mockClient.getTextContent(response);
      };

      const { results, errors } = await processor.processBatch(prompts, processorFn);

      assert.strictEqual(results.length, 3);
      assert.strictEqual(errors.length, 0);
      results.forEach((r) => {
        assert.strictEqual(r.result, 'Test response');
      });
    });
  });
});
