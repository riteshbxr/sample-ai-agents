import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';

/**
 * Evaluation & Testing Strategies Example
 * Demonstrates how to evaluate and test AI responses for quality and consistency
 */
class AIEvaluator {
  /**
   * Evaluate response quality using heuristics
   */
  static evaluateQuality(response, criteria = {}) {
    const { minLength = 10, maxLength = 5000 } = criteria;

    const issues = [];
    const score = {
      length: 0,
      relevance: 0,
      completeness: 0,
      clarity: 0,
      total: 0,
    };

    // Length check
    if (response.length < minLength) {
      issues.push('Response too short');
      score.length = 0.5;
    } else if (response.length > maxLength) {
      issues.push('Response too long');
      score.length = 0.8;
    } else {
      score.length = 1.0;
    }

    // Relevance check (simple keyword matching - can be enhanced)
    const hasContent = response.length > 0;
    score.relevance = hasContent ? 1.0 : 0.0;

    // Completeness check (ends with punctuation)
    const isComplete = /[.!?]$/.test(response.trim());
    score.completeness = isComplete ? 1.0 : 0.8;

    // Clarity check (no excessive repetition)
    const words = response.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    score.clarity = repetitionRatio > 0.5 ? 1.0 : repetitionRatio;

    // Total score
    score.total =
      score.length * 0.2 + score.relevance * 0.3 + score.completeness * 0.2 + score.clarity * 0.3;

    return {
      score: (score.total * 100).toFixed(1),
      breakdown: score,
      issues,
      passed: issues.length === 0,
    };
  }

  /**
   * Compare two responses for consistency
   */
  static compareResponses(response1, response2) {
    // Simple similarity (can use embeddings for better comparison)
    const words1 = new Set(response1.toLowerCase().split(/\s+/));
    const words2 = new Set(response2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = intersection.size / union.size;

    return {
      similarity: (jaccardSimilarity * 100).toFixed(1),
      consistent: jaccardSimilarity > 0.5,
    };
  }

  /**
   * A/B test two prompts
   */
  static async abTest(client, promptA, promptB, testQuery, iterations = 3) {
    const resultsA = [];
    const resultsB = [];

    for (let i = 0; i < iterations; i++) {
      const responseA = await client.chat([
        { role: 'system', content: promptA },
        { role: 'user', content: testQuery },
      ]);

      const responseB = await client.chat([
        { role: 'system', content: promptB },
        { role: 'user', content: testQuery },
      ]);

      resultsA.push(responseA.choices[0].message.content);
      resultsB.push(responseB.choices[0].message.content);
    }

    // Evaluate average quality
    const qualityA = resultsA.map((r) => this.evaluateQuality(r));
    const qualityB = resultsB.map((r) => this.evaluateQuality(r));

    const avgScoreA = (
      qualityA.reduce((sum, q) => sum + parseFloat(q.score), 0) / qualityA.length
    ).toFixed(1);

    const avgScoreB = (
      qualityB.reduce((sum, q) => sum + parseFloat(q.score), 0) / qualityB.length
    ).toFixed(1);

    return {
      promptA: {
        averageScore: avgScoreA,
        responses: resultsA.length,
      },
      promptB: {
        averageScore: avgScoreB,
        responses: resultsB.length,
      },
      winner: parseFloat(avgScoreA) > parseFloat(avgScoreB) ? 'A' : 'B',
    };
  }
}

async function evaluationExample() {
  console.log('=== Evaluation & Testing Strategies Example ===\n');

  // Example 1: Response Quality Evaluation
  console.log('1️⃣ Response Quality Evaluation:');
  console.log('-'.repeat(60));

  const testResponses = [
    'AI is artificial intelligence.',
    'Artificial Intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. AI systems can perform tasks such as visual perception, speech recognition, decision-making, and language translation.',
    'AI AI AI AI AI', // Low quality
    '', // Empty
  ];

  console.log('Evaluating response quality:\n');

  testResponses.forEach((response, idx) => {
    const evaluation = AIEvaluator.evaluateQuality(response);
    console.log(`Response ${idx + 1}: "${response.substring(0, 50)}..."`);
    console.log(`  Score: ${evaluation.score}/100`);
    console.log(`  Breakdown:`, evaluation.breakdown);
    if (evaluation.issues.length > 0) {
      console.log(`  Issues: ${evaluation.issues.join(', ')}`);
    }
    console.log(`  Passed: ${evaluation.passed ? '✅' : '❌'}\n`);
  });

  console.log('\n');

  // Example 2: Consistency Testing
  console.log('2️⃣ Consistency Testing:');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');
    const testQuery = 'What is machine learning?';

    console.log('Testing response consistency:\n');
    console.log(`Query: "${testQuery}"\n`);

    // Get multiple responses
    const responses = [];
    for (let i = 0; i < 3; i++) {
      const response = await openaiClient.chat([{ role: 'user', content: testQuery }], {
        temperature: 0.7,
      });
      responses.push(response.choices[0].message.content);
      console.log(`Response ${i + 1}: ${response.choices[0].message.content.substring(0, 100)}...`);
    }

    // Compare consistency
    console.log('\nConsistency analysis:');
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const comparison = AIEvaluator.compareResponses(responses[i], responses[j]);
        console.log(`Response ${i + 1} vs ${j + 1}:`);
        console.log(`  Similarity: ${comparison.similarity}%`);
        console.log(`  Consistent: ${comparison.consistent ? '✅' : '❌'}`);
      }
    }
  }

  console.log('\n');

  // Example 3: A/B Testing Prompts
  console.log('3️⃣ A/B Testing Prompts:');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');

    const promptA = 'You are a helpful assistant.';
    const promptB = 'You are an expert AI assistant. Provide detailed, accurate explanations.';
    const testQuery = 'Explain quantum computing simply.';

    console.log('A/B Testing two system prompts:\n');
    console.log(`Prompt A: "${promptA}"`);
    console.log(`Prompt B: "${promptB}"`);
    console.log(`Test Query: "${testQuery}"\n`);

    const abResults = await AIEvaluator.abTest(
      openaiClient,
      promptA,
      promptB,
      testQuery,
      2 // Reduced for demo
    );

    console.log('A/B Test Results:');
    console.log(`  Prompt A average score: ${abResults.promptA.averageScore}/100`);
    console.log(`  Prompt B average score: ${abResults.promptB.averageScore}/100`);
    console.log(`  Winner: Prompt ${abResults.winner}`);
  }

  console.log('\n');

  // Example 4: Automated Test Suite
  console.log('4️⃣ Automated Test Suite:');
  console.log('-'.repeat(60));

  class AITestSuite {
    constructor(client) {
      this.client = client;
      this.tests = [];
    }

    addTest(name, messages, expectedCriteria) {
      this.tests.push({
        name,
        messages,
        expectedCriteria,
      });
    }

    async run() {
      const results = [];

      for (const test of this.tests) {
        try {
          const response = await this.client.chat(test.messages);
          const content = response.choices[0].message.content;
          const evaluation = AIEvaluator.evaluateQuality(content, test.expectedCriteria);

          results.push({
            name: test.name,
            passed: evaluation.passed,
            score: evaluation.score,
            issues: evaluation.issues,
          });
        } catch (error) {
          results.push({
            name: test.name,
            passed: false,
            error: error.message,
          });
        }
      }

      return results;
    }
  }

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');
    const testSuite = new AITestSuite(openaiClient);

    // Add test cases
    testSuite.addTest('Basic Q&A', [{ role: 'user', content: 'What is AI?' }], {
      minLength: 20,
      requireCompleteness: true,
    });

    testSuite.addTest(
      'Complex Query',
      [{ role: 'user', content: 'Explain machine learning in detail' }],
      { minLength: 100, requireCompleteness: true }
    );

    console.log('Running automated test suite...\n');
    const results = await testSuite.run();

    console.log('Test Results:');
    results.forEach((result) => {
      console.log(`\n${result.name}:`);
      console.log(`  Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (result.score) {
        console.log(`  Score: ${result.score}/100`);
      }
      if (result.issues && result.issues.length > 0) {
        console.log(`  Issues: ${result.issues.join(', ')}`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    console.log(`\nSummary: ${passed}/${total} tests passed`);
  }

  console.log('\n');

  // Example 5: Performance Metrics
  console.log('5️⃣ Performance Metrics:');
  console.log('-'.repeat(60));

  class PerformanceMonitor {
    constructor() {
      this.metrics = {
        totalRequests: 0,
        averageLatency: 0,
        averageTokens: 0,
        errorRate: 0,
        successRate: 0,
      };
      this.latencies = [];
      this.errors = 0;
    }

    recordRequest(latency, tokens, success) {
      this.metrics.totalRequests++;
      this.latencies.push(latency);

      if (success) {
        this.metrics.averageTokens =
          (this.metrics.averageTokens * (this.metrics.totalRequests - 1) + tokens) /
          this.metrics.totalRequests;
      } else {
        this.errors++;
      }

      this.metrics.averageLatency =
        this.latencies.reduce((sum, l) => sum + l, 0) / this.latencies.length;

      this.metrics.errorRate = ((this.errors / this.metrics.totalRequests) * 100).toFixed(2);
      this.metrics.successRate = (
        ((this.metrics.totalRequests - this.errors) / this.metrics.totalRequests) *
        100
      ).toFixed(2);
    }

    getMetrics() {
      return this.metrics;
    }
  }

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');
    const monitor = new PerformanceMonitor();

    const queries = ['What is AI?', 'Explain machine learning', 'What is deep learning?'];

    console.log('Monitoring performance...\n');

    for (const query of queries) {
      const start = Date.now();
      try {
        const response = await openaiClient.chat([{ role: 'user', content: query }]);
        const latency = Date.now() - start;
        const tokens = response.usage?.total_tokens || 0;

        monitor.recordRequest(latency, tokens, true);
      } catch (error) {
        const latency = Date.now() - start;
        monitor.recordRequest(latency, 0, false);
      }
    }

    const metrics = monitor.getMetrics();
    console.log('Performance Metrics:');
    console.log(`  Total Requests: ${metrics.totalRequests}`);
    console.log(`  Average Latency: ${metrics.averageLatency.toFixed(0)}ms`);
    console.log(`  Average Tokens: ${metrics.averageTokens.toFixed(0)}`);
    console.log(`  Success Rate: ${metrics.successRate}%`);
    console.log(`  Error Rate: ${metrics.errorRate}%`);
  }

  console.log('\n💡 Evaluation Best Practices:');
  console.log('-'.repeat(60));
  console.log('1. Define clear quality criteria for your use case');
  console.log('2. Test consistency across multiple runs');
  console.log('3. A/B test different prompts to find optimal ones');
  console.log('4. Monitor performance metrics (latency, tokens, errors)');
  console.log('5. Automate testing for regression detection');
  console.log('6. Use human evaluation for subjective quality');
  console.log('7. Track metrics over time to detect degradation');
  console.log('8. Test edge cases and error scenarios');
}

evaluationExample().catch(console.error);
