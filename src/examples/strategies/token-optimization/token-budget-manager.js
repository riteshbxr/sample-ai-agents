import { TokenCounter } from './token-counter.js';

/**
 * Token Budget Manager
 * Manages token budgets for cost control
 */
export class TokenBudgetManager {
  constructor(maxTokens = 4000) {
    this.maxTokens = maxTokens;
    this.usedTokens = 0;
  }

  canAfford(messages) {
    const estimated = TokenCounter.countMessages(messages);
    return this.usedTokens + estimated <= this.maxTokens;
  }

  recordUsage(actualTokens) {
    this.usedTokens += actualTokens;
  }

  getRemaining() {
    return this.maxTokens - this.usedTokens;
  }

  reset() {
    this.usedTokens = 0;
  }
}
