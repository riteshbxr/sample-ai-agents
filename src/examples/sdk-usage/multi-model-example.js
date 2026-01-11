import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';

/**
 * Multi-Model Example
 * Compare outputs from different models for the same query
 */
async function multiModelExample() {
  console.log('=== Multi-Model Comparison Example ===\n');

  const question =
    'Explain RAG (Retrieval-Augmented Generation) in simple terms for a startup founder.';

  console.log(`Question: ${question}\n`);
  console.log('='.repeat(60) + '\n');

  // OpenAI/Azure OpenAI Response
  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const openaiClient = createAIClient('openai');
    console.log(`🤖 OpenAI ${openaiClient.model || config.openai.model}:`);
    console.log('-'.repeat(60));
    const openaiMessages = [
      {
        role: 'user',
        content: question,
      },
    ];

    const openaiResponse = await openaiClient.chat(openaiMessages);
    console.log(openaiClient.getTextContent(openaiResponse));
    console.log('\n');
  }

  // Claude Response
  if (config.claude.apiKey) {
    const claudeClient = createAIClient('claude');
    console.log(`🤖 Claude ${claudeClient.model || config.claude.model}:`);
    console.log('-'.repeat(60));
    const claudeMessages = [
      {
        role: 'user',
        content: question,
      },
    ];

    const claudeResponse = await claudeClient.chat(claudeMessages);
    const claudeText = claudeClient.getTextContent(claudeResponse);
    console.log(claudeText);
    console.log('\n');
  }

  console.log('='.repeat(60));
  console.log(
    '\n💡 Tip: Compare the responses to see how different models approach the same question!'
  );
}

// Run the example
multiModelExample().catch(console.error);
