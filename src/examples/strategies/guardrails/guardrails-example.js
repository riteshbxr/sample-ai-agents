import { providerUtils } from '../../../config.js';
import {
  GuardrailsEngine,
  GuardedAIClient,
  LengthGuardrail,
  FormatGuardrail,
  ContentPolicyGuardrail,
  FactualGuardrail,
  ToneGuardrail,
  PIIGuardrail,
} from './guardrails.js';

/**
 * Guardrails Example
 * Demonstrates output validation and safety patterns
 *
 * Patterns demonstrated:
 * 1. Basic output validation (length, format)
 * 2. Content policy enforcement
 * 3. Factual accuracy checking
 * 4. PII detection and masking
 * 5. Tone and consistency validation
 * 6. Guarded AI client wrapper
 */

async function guardrailsExample() {
  console.log('=== Guardrails / Output Validation Example ===');
  console.log('Patterns for validating and constraining AI outputs\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  try {
    // Example 1: Length Guardrail
    console.log('1️⃣ Length Guardrail');
    console.log('─'.repeat(60));

    const lengthGuardrail = new LengthGuardrail({
      minLength: 50,
      maxLength: 500,
      minWords: 10,
      maxWords: 100,
    });

    const testOutputs = [
      'Too short.',
      'This is a moderately sized response that should pass the length guardrail because it has enough words and characters to meet the minimum requirements while staying under the maximum limits.',
      'A'.repeat(600), // Too long
    ];

    console.log('\n📝 Testing length constraints:');
    for (const output of testOutputs) {
      const result = await lengthGuardrail.validate(output);
      console.log(`\n   Input: "${output.substring(0, 50)}${output.length > 50 ? '...' : ''}"`);
      console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
      console.log(
        `   Metrics: ${result.metrics.charCount} chars, ${result.metrics.wordCount} words`
      );
      if (result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join('; ')}`);
      }
    }

    console.log('\n');

    // Example 2: Format Guardrail
    console.log('2️⃣ Format Guardrail');
    console.log('─'.repeat(60));

    const jsonGuardrail = new FormatGuardrail(
      {
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      },
      'json'
    );

    const jsonOutputs = [
      '{"name": "John", "age": 30}',
      '{"name": "Jane"}', // Missing required field
      'not json at all',
    ];

    console.log('\n📝 Testing JSON format:');
    for (const output of jsonOutputs) {
      const result = await jsonGuardrail.validate(output);
      console.log(`\n   Input: "${output}"`);
      console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
      if (result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join('; ')}`);
      }
    }

    console.log('\n');

    // Example 3: Content Policy Guardrail
    console.log('3️⃣ Content Policy Guardrail');
    console.log('─'.repeat(60));

    const contentGuardrail = new ContentPolicyGuardrail({
      blockedTerms: ['confidential', 'secret project'],
      blockedPatterns: ['password:\\s*\\w+'],
    });

    const contentOutputs = [
      'Here is a helpful response about programming.',
      'The confidential document contains secret project details.',
      'The login is password: abc123',
    ];

    console.log('\n📝 Testing content policy:');
    for (const output of contentOutputs) {
      const result = await contentGuardrail.validate(output);
      console.log(`\n   Input: "${output}"`);
      console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
      if (result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join('; ')}`);

        // Demonstrate auto-fix
        const fixed = await contentGuardrail.fix(output, result);
        if (fixed !== output) {
          console.log(`   Fixed: "${fixed}"`);
        }
      }
    }

    console.log('\n');

    // Example 4: PII Guardrail
    console.log('4️⃣ PII Detection Guardrail');
    console.log('─'.repeat(60));

    const piiGuardrail = new PIIGuardrail({ action: 'mask' });

    const piiOutputs = [
      'Contact us at support@example.com or call 555-123-4567.',
      'Your SSN is 123-45-6789 and card number is 4111-1111-1111-1111.',
      'This output contains no personal information.',
    ];

    console.log('\n📝 Testing PII detection:');
    for (const output of piiOutputs) {
      const result = await piiGuardrail.validate(output);
      console.log(`\n   Input: "${output}"`);
      console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
      if (result.detected?.length > 0) {
        console.log(`   Detected PII: ${result.detected.map((d) => d.type).join(', ')}`);

        // Demonstrate masking
        const masked = await piiGuardrail.fix(output, result);
        console.log(`   Masked: "${masked}"`);
      }
    }

    console.log('\n');

    // Example 5: Factual Guardrail
    console.log('5️⃣ Factual Accuracy Guardrail');
    console.log('─'.repeat(60));

    const factualGuardrail = new FactualGuardrail(provider);

    const factualOutputs = [
      'The Earth orbits around the Sun, and water is composed of hydrogen and oxygen.',
      'The Sun orbits around the Earth, and the Moon is made of cheese.',
    ];

    console.log('\n📝 Testing factual accuracy:');
    for (const output of factualOutputs) {
      console.log(`\n   Input: "${output}"`);
      console.log('   Checking facts...');
      const result = await factualGuardrail.validate(output);
      console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
      console.log(`   Confidence: ${((result.confidenceScore || 0) * 100).toFixed(0)}%`);
      if (result.issues?.length > 0) {
        console.log(`   Issues: ${result.issues.slice(0, 2).join('; ')}`);
      }
    }

    console.log('\n');

    // Example 6: Tone Guardrail
    console.log('6️⃣ Tone Guardrail');
    console.log('─'.repeat(60));

    const toneGuardrail = new ToneGuardrail({ tone: 'professional', provider });

    const toneOutputs = [
      'Thank you for your inquiry. I would be happy to assist you with your request.',
      'yo dude whats up lol this is totally awesome!!!!!',
    ];

    console.log('\n📝 Testing tone compliance:');
    for (const output of toneOutputs) {
      console.log(`\n   Input: "${output}"`);
      console.log('   Analyzing tone...');
      const result = await toneGuardrail.validate(output);
      console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
      console.log(`   Detected tone: ${result.detectedTone || 'unknown'}`);
      if (result.suggestions?.length > 0) {
        console.log(`   Suggestions: ${result.suggestions[0]}`);
      }
    }

    console.log('\n');

    // Example 7: Guardrails Engine (Multiple Guardrails)
    console.log('7️⃣ Guardrails Engine (Multiple Guardrails)');
    console.log('─'.repeat(60));

    const engine = new GuardrailsEngine({
      verbose: true,
      autoFix: true,
      failFast: false,
    });

    engine
      .addGuardrail(new LengthGuardrail({ minLength: 10, maxLength: 1000 }))
      .addGuardrail(new ContentPolicyGuardrail())
      .addGuardrail(new PIIGuardrail({ action: 'mask' }));

    const testOutput =
      'Contact John at john@email.com or call 555-123-4567 for confidential information about the project. This is a detailed response.';

    console.log(`\n📝 Testing with multiple guardrails:`);
    console.log(`   Input: "${testOutput}"`);
    console.log('\n   Running guardrails:');

    const engineResult = await engine.validate(testOutput);

    console.log(`\n   Overall Valid: ${engineResult.valid ? '✅' : '❌'}`);
    console.log(`   Was Fixed: ${engineResult.wasFixed}`);
    if (engineResult.wasFixed) {
      console.log(`   Fixed Output: "${engineResult.output}"`);
    }

    console.log('\n');

    // Example 8: Guarded AI Client
    console.log('8️⃣ Guarded AI Client');
    console.log('─'.repeat(60));

    const guardedClient = new GuardedAIClient(provider);

    console.log('\n📝 Making guarded API call:');
    const response = await guardedClient.chat([
      { role: 'user', content: 'Tell me a short fact about the solar system.' },
    ]);

    console.log(`\n   Original response: "${response.originalResponse?.substring(0, 150)}..."`);
    console.log(`   Validation passed: ${response.validation.valid ? '✅' : '❌'}`);
    console.log(`   Guardrails run: ${response.validation.results.length}`);

    for (const result of response.validation.results) {
      console.log(`      - ${result.guardrail}: ${result.valid ? '✅' : '❌'}`);
    }

    console.log('\n');

    // Example 9: Pre-configured Engines
    console.log('9️⃣ Pre-configured Guardrail Engines');
    console.log('─'.repeat(60));

    console.log('\n📝 Default Engine:');
    const defaultEngine = GuardrailsEngine.createDefault(provider);
    console.log(`   Guardrails: ${defaultEngine.guardrails.map((g) => g.name).join(', ')}`);

    console.log('\n📝 Strict Engine:');
    const strictEngine = GuardrailsEngine.createStrict(provider);
    console.log(`   Guardrails: ${strictEngine.guardrails.map((g) => g.name).join(', ')}`);
    console.log(`   Fail Fast: ${strictEngine.failFast}`);

    console.log('\n');

    // Summary
    console.log('📋 Summary');
    console.log('─'.repeat(60));
    console.log('\n💡 Key Patterns Demonstrated:\n');

    console.log('1. Length Validation:');
    console.log('   - Enforce min/max character limits');
    console.log('   - Word count constraints\n');

    console.log('2. Format Validation:');
    console.log('   - JSON schema validation');
    console.log('   - Markdown and code format checking\n');

    console.log('3. Content Policy:');
    console.log('   - Block specific terms and patterns');
    console.log('   - Detect potentially harmful content\n');

    console.log('4. PII Protection:');
    console.log('   - Detect emails, phones, SSNs, credit cards');
    console.log('   - Auto-mask sensitive information\n');

    console.log('5. Factual Accuracy:');
    console.log('   - AI-powered fact checking');
    console.log('   - Identify misleading claims\n');

    console.log('6. Tone Compliance:');
    console.log('   - Ensure appropriate communication style');
    console.log('   - Match expected tone (professional, casual, etc.)\n');

    console.log('7. Guardrails Engine:');
    console.log('   - Chain multiple guardrails');
    console.log('   - Auto-fix capability');
    console.log('   - Fail-fast or process all options\n');

    console.log('🔗 Related Tools & Frameworks:');
    console.log('   - NeMo Guardrails (NVIDIA)');
    console.log('   - Guardrails AI');
    console.log('   - LlamaGuard (Meta)');
    console.log('   - Constitutional AI (Anthropic)');

    console.log('\n✅ Guardrails examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
guardrailsExample().catch(console.error);
