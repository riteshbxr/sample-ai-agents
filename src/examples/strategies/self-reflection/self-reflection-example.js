import { providerUtils } from '../../../config.js';
import {
  SelfReflectionAgent,
  CodeReflectionAgent,
  VerificationAgent,
} from './self-reflection-agent.js';

/**
 * Self-Reflection Agent Example
 * Demonstrates agents that critique and improve their own output
 *
 * Patterns demonstrated:
 * 1. Basic Self-Reflection (generate -> critique -> revise)
 * 2. Code Self-Reflection (specialized for code review)
 * 3. Chain-of-Verification (verify claims in output)
 */

async function selfReflectionExample() {
  console.log('=== Self-Reflection Agent Example ===');
  console.log('Agents that critique and improve their own output\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  try {
    // Example 1: Basic Self-Reflection
    console.log('1️⃣ Basic Self-Reflection');
    console.log('─'.repeat(60));

    const agent = new SelfReflectionAgent(provider, {
      maxIterations: 2,
      qualityThreshold: 0.85,
      verbose: true,
    });

    const task1 = 'Explain the concept of recursion in programming to a beginner.';

    console.log(`\n📝 Task: "${task1}"`);
    console.log('\nStarting self-reflection loop...\n');

    const result1 = await agent.reflect(task1);

    console.log('\n📊 Results:');
    console.log(`   Total iterations: ${result1.iterations}`);
    console.log(`   Final score: ${(result1.finalScore * 100).toFixed(1)}%`);
    console.log(`   Final response preview: ${result1.finalResponse.substring(0, 300)}...`);

    const stats = agent.getStats();
    if (stats) {
      console.log(`\n📈 Statistics:`);
      console.log(`   Score improvement: +${(stats.scoreImprovement * 100).toFixed(1)}%`);
      console.log(
        `   Score progression: ${stats.scoreProgression.map((s) => `${(s * 100).toFixed(0)}%`).join(' → ')}`
      );
    }

    console.log('\n');

    // Example 2: Code Self-Reflection
    console.log('2️⃣ Code Self-Reflection');
    console.log('─'.repeat(60));

    const codeAgent = new CodeReflectionAgent(provider, {
      maxIterations: 2,
      qualityThreshold: 0.85,
      verbose: true,
    });

    const task2 = 'Write a JavaScript function that finds all prime numbers up to n.';

    console.log(`\n📝 Task: "${task2}"`);
    console.log('\nStarting code self-reflection...\n');

    const result2 = await codeAgent.reflect(task2);

    console.log('\n📊 Results:');
    console.log(`   Total iterations: ${result2.iterations}`);
    console.log(`   Final score: ${(result2.finalScore * 100).toFixed(1)}%`);
    console.log(`   Final code:`);
    console.log(`   ${result2.finalResponse.substring(0, 500).split('\n').join('\n   ')}...`);

    console.log('\n');

    // Example 3: Chain-of-Verification
    console.log('3️⃣ Chain-of-Verification');
    console.log('─'.repeat(60));

    const verifyAgent = new VerificationAgent(provider, {
      maxIterations: 1,
      qualityThreshold: 0.7,
      verbose: true,
    });

    const task3 = 'What are the key benefits of using TypeScript over JavaScript?';

    console.log(`\n📝 Task: "${task3}"`);
    console.log('\nGenerating and verifying response...\n');

    const result3 = await verifyAgent.reflectWithVerification(task3);

    console.log('\n📊 Verification Results:');
    console.log(`   Claims verified: ${result3.verification.claims.length}`);
    console.log(
      `   Verification rate: ${(result3.verification.verificationRate * 100).toFixed(1)}%`
    );

    console.log('\n   Claims Analysis:');
    for (const claim of result3.verification.claims.slice(0, 3)) {
      const status = claim.isVerified ? '✅' : '❌';
      console.log(`   ${status} "${claim.claim.substring(0, 60)}..."`);
      console.log(`      Confidence: ${(claim.confidence * 100).toFixed(0)}%`);
    }

    console.log('\n');

    // Summary
    console.log('📋 Summary');
    console.log('─'.repeat(60));
    console.log('\n💡 Key Patterns Demonstrated:\n');
    console.log('1. Self-Reflection Loop:');
    console.log('   Generate → Critique → Revise → Repeat');
    console.log('   - Iteratively improves output quality');
    console.log('   - Stops when quality threshold is met\n');

    console.log('2. Code-Specific Reflection:');
    console.log('   - Specialized criteria for code review');
    console.log('   - Evaluates correctness, efficiency, readability\n');

    console.log('3. Chain-of-Verification:');
    console.log('   - Extracts factual claims from response');
    console.log('   - Verifies each claim independently');
    console.log('   - Reduces hallucination risk\n');

    console.log('🔗 Related Patterns:');
    console.log('   - Constitutional AI (Anthropic)');
    console.log('   - Self-Refine (Madaan et al., 2023)');
    console.log('   - Reflexion (Shinn et al., 2023)');
    console.log('   - Tree of Thoughts');

    console.log('\n✅ Self-Reflection examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
selfReflectionExample().catch(console.error);
