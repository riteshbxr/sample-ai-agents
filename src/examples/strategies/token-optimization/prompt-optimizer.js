import { TokenCounter } from './token-counter.js';

/**
 * Prompt Optimizer
 * Optimizes prompts to reduce token usage
 */
export class PromptOptimizer {
  /**
   * Remove unnecessary whitespace
   */
  static removeWhitespace(prompt) {
    return prompt.replace(/\s+/g, ' ').trim();
  }

  /**
   * Remove redundant words
   */
  static removeRedundancy(prompt) {
    // Simple redundancy removal (can be enhanced)
    return prompt
      .replace(/\b(very|really|quite|extremely)\s+/gi, '')
      .replace(/\b(please|kindly)\s+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Optimize system prompt
   */
  static optimizeSystemPrompt(prompt) {
    // Remove verbose instructions, keep essential
    let optimized = prompt
      .replace(/I want you to/gi, '')
      .replace(/I need you to/gi, '')
      .replace(/Please make sure/gi, '')
      .replace(/It is important that/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return optimized;
  }

  /**
   * Compare original vs optimized
   */
  static compare(original, optimized) {
    const originalTokens = TokenCounter.estimateTokens(original);
    const optimizedTokens = TokenCounter.estimateTokens(optimized);
    const reduction = originalTokens - optimizedTokens;
    const percentReduction = ((reduction / originalTokens) * 100).toFixed(1);

    return {
      originalTokens,
      optimizedTokens,
      reduction,
      percentReduction: `${percentReduction}%`,
    };
  }
}
