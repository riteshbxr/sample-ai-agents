import { ModelComparisonService } from '../../services/model-comparison-service.js';

/**
 * Multi-Model Example
 * Compare outputs from different models for the same query
 */
async function multiModelExample() {
  console.log('=== Multi-Model Comparison Example ===\n');

  const question =
    'Explain RAG (Retrieval-Augmented Generation) in simple terms for a startup founder.';

  console.log(`Question: ${question}\n`);
  console.log(`${'='.repeat(60)}\n`);

  const comparisonService = new ModelComparisonService();
  const responses = await comparisonService.compareQuery(question);

  // Display responses
  if (responses.openai) {
    if (responses.openai.error) {
      console.log(`🤖 OpenAI: Error - ${responses.openai.error}\n`);
    } else {
      console.log(`🤖 OpenAI ${responses.openai.model}:`);
      console.log('-'.repeat(60));
      console.log(responses.openai.content);
      console.log('\n');
    }
  }

  if (responses.claude) {
    if (responses.claude.error) {
      console.log(`🤖 Claude: Error - ${responses.claude.error}\n`);
    } else {
      console.log(`🤖 Claude ${responses.claude.model}:`);
      console.log('-'.repeat(60));
      console.log(responses.claude.content);
      console.log('\n');
    }
  }

  console.log('='.repeat(60));
  console.log(
    '\n💡 Tip: Compare the responses to see how different models approach the same question!'
  );
}

// Run the example
multiModelExample().catch(console.error);
