import { TokenCounter } from './token-counter.js';

/**
 * Context Optimizer
 * Optimizes conversation context to fit within token limits
 */
export function optimizeContext(messages, maxTokens = 3000) {
  const currentTokens = TokenCounter.countMessages(messages);

  if (currentTokens <= maxTokens) {
    return { optimized: messages, removed: 0, reduction: 0 };
  }

  // Keep system message and recent messages
  const systemMessage = messages[0];
  const userMessages = messages.slice(1);

  // Remove oldest messages until under budget
  const optimized = [systemMessage];
  let removed = 0;

  for (let i = userMessages.length - 1; i >= 0; i--) {
    const testMessages = [...optimized, userMessages[i]];
    if (TokenCounter.countMessages(testMessages) <= maxTokens) {
      optimized.push(userMessages[i]);
    } else {
      removed++;
    }
  }

  const reduction = currentTokens - TokenCounter.countMessages(optimized);

  return {
    optimized,
    removed,
    reduction,
    originalTokens: currentTokens,
    optimizedTokens: TokenCounter.countMessages(optimized),
  };
}
