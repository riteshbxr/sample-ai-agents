import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';
import {
  estimateTokens as estimateTokensUtil,
  countMessages as countMessagesUtil,
  getActualTokens as getActualTokensUtil,
} from '../../utils/token-utils.js';

/**
 * Token Counting & Optimization Example
 * Demonstrates token counting strategies and prompt optimization techniques
 */
class TokenCounter {
  /**
   * Rough token estimation (1 token ≈ 4 characters for English)
   * For accurate counting, use tiktoken library or API response
   */
  static estimateTokens(text) {
    return estimateTokensUtil(text);
  }

  /**
   * Count tokens in messages array
   */
  static countMessages(messages) {
    return countMessagesUtil(messages);
  }

  /**
   * Get actual token count from API response
   */
  static getActualTokens(response) {
    return getActualTokensUtil(response);
  }
}

class PromptOptimizer {
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

async function tokenOptimizationExample() {
  console.log('=== Token Counting & Optimization Example ===\n');

  // Example 1: Token Counting
  console.log('1️⃣ Token Counting:');
  console.log('-'.repeat(60));

  const sampleTexts = [
    'Hello, world!',
    'The quick brown fox jumps over the lazy dog',
    'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.',
  ];

  console.log('Token estimation:\n');
  sampleTexts.forEach((text) => {
    const tokens = TokenCounter.estimateTokens(text);
    console.log(`Text: "${text}"`);
    console.log(`  Characters: ${text.length}`);
    console.log(`  Estimated tokens: ${tokens}`);
    console.log(`  Ratio: ${(text.length / tokens).toFixed(2)} chars/token\n`);
  });

  // Actual token count from API
  if (providerUtils.isProviderAvailable('openai')) {
    const openaiClient = createAIClient('azure-openai');
    const messages = [{ role: 'user', content: 'What is AI?' }];

    const response = await openaiClient.chat(messages);
    const actualTokens = TokenCounter.getActualTokens(response);

    if (actualTokens) {
      console.log('Actual token count from API:');
      console.log(`  Prompt tokens: ${actualTokens.prompt}`);
      console.log(`  Completion tokens: ${actualTokens.completion}`);
      console.log(`  Total tokens: ${actualTokens.total}\n`);
    }
  }

  console.log('\n');

  // Example 2: Prompt Optimization
  console.log('2️⃣ Prompt Optimization:');
  console.log('-'.repeat(60));

  const verbosePrompt = `
    I want you to please help me understand what artificial intelligence is.
    It is very important that you explain this really clearly and in a way
    that is quite easy to understand. Please make sure to include examples
    and be very thorough in your explanation.
  `;

  const optimizedPrompt = PromptOptimizer.optimizeSystemPrompt(verbosePrompt);

  console.log('Original prompt:');
  console.log(`"${verbosePrompt.trim()}"\n`);
  console.log('Optimized prompt:');
  console.log(`"${optimizedPrompt}"\n`);

  const comparison = PromptOptimizer.compare(verbosePrompt, optimizedPrompt);
  console.log('Optimization results:');
  console.log(`  Original tokens: ${comparison.originalTokens}`);
  console.log(`  Optimized tokens: ${comparison.optimizedTokens}`);
  console.log(`  Reduction: ${comparison.reduction} tokens (${comparison.percentReduction})\n`);

  console.log('\n');

  // Example 3: System Prompt Optimization
  console.log('3️⃣ System Prompt Optimization:');
  console.log('-'.repeat(60));

  const systemPrompts = {
    verbose: `You are a very helpful and knowledgeable assistant. 
    I want you to always be polite, professional, and provide accurate information.
    Please make sure to explain things clearly and in detail. It is important
    that you always double-check your responses for accuracy.`,

    optimized: `You are a helpful assistant. Be accurate and clear.`,

    balanced: `You are a helpful assistant. Provide accurate, clear explanations.`,
  };

  console.log('Comparing system prompt lengths:\n');

  Object.entries(systemPrompts).forEach(([name, prompt]) => {
    const tokens = TokenCounter.estimateTokens(prompt);
    console.log(`${name}:`);
    console.log(`  "${prompt}"`);
    console.log(`  Tokens: ${tokens}\n`);
  });

  // Test with actual API
  if (providerUtils.isProviderAvailable('openai')) {
    const openaiClient = createAIClient('azure-openai');
    const testQuery = 'What is machine learning?';

    console.log('Testing with actual API:\n');

    for (const [name, systemPrompt] of Object.entries(systemPrompts)) {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: testQuery },
      ];

      const response = await openaiClient.chat(messages);
      const tokens = TokenCounter.getActualTokens(response);

      console.log(`${name} system prompt:`);
      console.log(`  Prompt tokens: ${tokens?.prompt || 'N/A'}`);
      console.log(`  Completion tokens: ${tokens?.completion || 'N/A'}`);
      console.log(`  Total tokens: ${tokens?.total || 'N/A'}\n`);
    }
  }

  console.log('\n');

  // Example 4: Token Budget Management
  console.log('4️⃣ Token Budget Management:');
  console.log('-'.repeat(60));

  class TokenBudgetManager {
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

  const budgetManager = new TokenBudgetManager(4000);

  console.log(`Token budget: ${budgetManager.maxTokens} tokens\n`);

  const conversationMessages = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'What is AI?' },
  ];

  if (budgetManager.canAfford(conversationMessages)) {
    console.log('✅ Request fits within budget');
    console.log(`   Estimated: ${TokenCounter.countMessages(conversationMessages)} tokens`);
    console.log(`   Remaining: ${budgetManager.getRemaining()} tokens`);
  } else {
    console.log('❌ Request exceeds budget');
  }

  console.log('\n');

  // Example 5: Context Window Optimization
  console.log('5️⃣ Context Window Optimization:');
  console.log('-'.repeat(60));

  function optimizeContext(messages, maxTokens = 3000) {
    const currentTokens = TokenCounter.countMessages(messages);

    if (currentTokens <= maxTokens) {
      return { optimized: messages, removed: 0, reduction: 0 };
    }

    // Keep system message and recent messages
    const systemMessage = messages[0];
    const userMessages = messages.slice(1);

    // Remove oldest messages until under budget
    let optimized = [systemMessage];
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

  // Simulate long conversation
  const longConversation = [
    { role: 'system', content: 'You are helpful.' },
    ...Array.from({ length: 20 }, (_, i) => ({
      role: 'user',
      content: `Question ${i + 1}: What is topic ${i + 1}?`,
    })),
  ];

  const optimization = optimizeContext(longConversation, 1000);

  console.log('Context optimization:');
  console.log(`  Original messages: ${longConversation.length}`);
  console.log(`  Optimized messages: ${optimization.optimized.length}`);
  console.log(`  Removed messages: ${optimization.removed}`);
  console.log(`  Original tokens: ${optimization.originalTokens}`);
  console.log(`  Optimized tokens: ${optimization.optimizedTokens}`);
  console.log(`  Token reduction: ${optimization.reduction}`);

  console.log('\n💡 Token Optimization Tips:');
  console.log('-'.repeat(60));
  console.log('1. Keep system prompts concise and focused');
  console.log('2. Remove unnecessary words and redundancy');
  console.log('3. Use shorter, more direct prompts');
  console.log('4. Monitor actual token usage from API responses');
  console.log('5. Implement token budgets for cost control');
  console.log('6. Optimize context windows for long conversations');
  console.log('7. Cache frequently used prompts');
  console.log('8. Use streaming for long responses to show progress');
}

tokenOptimizationExample().catch(console.error);
