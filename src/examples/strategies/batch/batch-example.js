import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';

/**
 * Batch Processing Example
 * Demonstrates efficient processing of multiple requests
 */
class BatchProcessor {
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

async function batchExample() {
  console.log('=== Batch Processing Example ===\n');

  // Example 1: Process multiple chat requests in parallel
  console.log('1️⃣ Parallel Chat Processing:');
  console.log('-'.repeat(60));

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('azure-openai');
    const processor = new BatchProcessor(openaiClient, 3);

    const questions = [
      'What is AI?',
      'Explain machine learning.',
      'Describe neural networks.',
      'What is deep learning?',
      'Explain natural language processing.',
    ];

    console.log(`Processing ${questions.length} questions in batches of 3...\n`);

    const { results, errors } = await processor.processBatch(questions, async (question) => {
      const response = await openaiClient.chat([{ role: 'user', content: question }]);
      return response.choices[0].message.content.substring(0, 100);
    });

    console.log(`\n✅ Successfully processed: ${results.length}`);
    console.log(`❌ Failed: ${errors.length}`);

    results.forEach((r, i) => {
      console.log(`\n${i + 1}. Q: ${r.item}`);
      console.log(`   A: ${r.result}...`);
    });
  }

  console.log('\n');

  // Example 2: Batch text classification
  console.log('2️⃣ Batch Text Classification:');
  console.log('-'.repeat(60));

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('azure-openai');
    const processor = new BatchProcessor(openaiClient, 5);

    const texts = [
      'I love this product! It works perfectly.',
      'This is terrible. Nothing works as expected.',
      'The service is okay, could be better.',
      'Amazing experience! Highly recommend.',
      'Not satisfied with the quality.',
    ];

    console.log(`Classifying ${texts.length} texts...\n`);

    const { results } = await processor.processBatch(texts, async (text) => {
      const response = await openaiClient.chat(
        [
          {
            role: 'system',
            content:
              'Classify the sentiment as: positive, negative, or neutral. Return only the classification.',
          },
          { role: 'user', content: text },
        ],
        { temperature: 0 }
      );
      return response.choices[0].message.content.trim();
    });

    results.forEach((r, i) => {
      console.log(`Text ${i + 1}: "${r.item.substring(0, 40)}..." → ${r.result}`);
    });
  }

  console.log('\n');

  // Example 3: Sequential processing with dependencies
  console.log('3️⃣ Sequential Processing (with dependencies):');
  console.log('-'.repeat(60));

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('azure-openai');

    const steps = [
      { task: 'Generate a product name', prompt: 'Generate a name for an AI-powered email tool' },
      { task: 'Create tagline', prompt: 'Create a tagline for the product' },
      { task: 'Write description', prompt: 'Write a product description' },
    ];

    let previousResult = '';
    const results = [];

    for (const step of steps) {
      const prompt = previousResult
        ? `${step.prompt}. Previous context: ${previousResult.substring(0, 100)}`
        : step.prompt;

      const response = await openaiClient.chat([{ role: 'user', content: prompt }]);

      const result = response.choices[0].message.content;
      results.push({ step: step.task, result });
      previousResult = result;

      console.log(`✅ ${step.task}: ${result.substring(0, 80)}...`);
    }
  }

  console.log('\n');

  // Example 4: Rate limit handling
  console.log('4️⃣ Rate Limit Handling:');
  console.log('-'.repeat(60));

  class RateLimitedProcessor {
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

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('azure-openai');
    const rateLimitedProcessor = new RateLimitedProcessor(openaiClient, 2);

    const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];
    console.log(`Processing ${items.length} items with rate limit (2 req/sec)...\n`);

    const startTime = Date.now();
    const promises = items.map((item) =>
      rateLimitedProcessor.process(item, async () => {
        const response = await openaiClient.chat([{ role: 'user', content: `Process: ${item}` }]);
        return response.choices[0].message.content.substring(0, 50);
      })
    );

    const results = await Promise.all(promises);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`✅ Processed ${results.length} items in ${duration.toFixed(2)}s`);
    console.log(`   Average: ${(duration / results.length).toFixed(2)}s per item`);
  }
}

batchExample().catch(console.error);
