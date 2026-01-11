import { AIEvaluator } from './ai-evaluator.js';

/**
 * AI Test Suite
 * Automated testing framework for AI responses
 */
export class AITestSuite {
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
        const content =
          response.choices?.[0]?.message?.content ||
          (this.client.getTextContent ? this.client.getTextContent(response) : '');
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
