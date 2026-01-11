/**
 * AI Evaluator
 * Evaluates AI responses for quality and consistency
 */
export class AIEvaluator {
  /**
   * Evaluate response quality using heuristics
   */
  static evaluateQuality(response, criteria = {}) {
    const {
      minLength = 10,
      maxLength = 5000,
      requireRelevance = true,
      requireCompleteness = true,
    } = criteria;

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

      const contentA =
        responseA.choices?.[0]?.message?.content ||
        (client.getTextContent ? client.getTextContent(responseA) : '');
      const contentB =
        responseB.choices?.[0]?.message?.content ||
        (client.getTextContent ? client.getTextContent(responseB) : '');

      resultsA.push(contentA);
      resultsB.push(contentB);
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
