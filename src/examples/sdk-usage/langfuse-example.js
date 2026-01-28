import { Langfuse } from 'langfuse';
import { createAIClient } from '../../clients/client-factory.js';
import { config, providerUtils, defaultOptions } from '../../config.js';

/**
 * Langfuse Example
 * Demonstrates LLM observability, tracing, and monitoring with Langfuse
 *
 * Langfuse is an open-source LLM observability platform that provides:
 * - Tracing: Track LLM calls and their context
 * - Logging: Log all LLM interactions
 * - Analytics: Analyze costs, latency, and quality
 * - Feedback: Collect user feedback on LLM outputs
 */

// Initialize Langfuse client
// Note: Langfuse can run self-hosted or use their cloud service
// Set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY in .env
// Or set LANGFUSE_HOST for self-hosted instance
let langfuse = null;

function initializeLangfuse() {
  try {
    const { secretKey } = config.langfuse;
    const { publicKey } = config.langfuse;
    const { host } = config.langfuse;

    if (!secretKey || !publicKey) {
      throw new Error(
        'Langfuse keys not set. Please set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY in your .env file.'
      );
    }

    // Validate key formats (basic check)
    if (secretKey.length < 10 || publicKey.length < 10) {
      throw new Error(
        'Langfuse keys appear invalid. Please verify your LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY are correct.'
      );
    }

    const langfuseConfig = {
      secretKey,
      publicKey,
    };

    // Only add host if it's not the default cloud URL
    if (host !== 'https://cloud.langfuse.com') {
      // Ensure host doesn't have trailing slash
      const cleanHost = host.replace(/\/$/, '');
      langfuseConfig.baseUrl = cleanHost;
      console.log(`🔧 Using self-hosted Langfuse: ${cleanHost}`);
    }

    langfuse = new Langfuse(langfuseConfig);

    // Test connection (non-blocking, will fail gracefully if auth is wrong)
    // Note: Langfuse doesn't have a built-in auth_check in JS SDK, so we'll catch errors during first trace

    console.log('✅ Langfuse initialized');
    if (host === 'https://cloud.langfuse.com') {
      console.log('   Using Langfuse Cloud\n');
    } else {
      console.log(`   Using self-hosted instance: ${langfuseConfig.baseUrl}\n`);
    }

    return langfuse;
  } catch (error) {
    console.log('⚠️  Failed to initialize Langfuse:', error.message);
    console.log(
      '💡 Check your LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, and LANGFUSE_HOST settings.\n'
    );
    return null;
  }
}

/**
 * Example 1: Basic Tracing
 */
async function basicTracingExample() {
  console.log('\n1️⃣ Basic Tracing');
  console.log('='.repeat(60));

  if (!langfuse) {
    throw new Error(
      'Langfuse not initialized. Please configure LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY.'
    );
  }

  const trace = langfuse.trace({
    name: 'basic-chat-example',
    metadata: {
      example: 'basic-tracing',
      timestamp: new Date().toISOString(),
    },
  });

  try {
    const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
    const client = createAIClient(provider);

    console.log(`\n📥 User Query: "What is RAG?"`);

    // Create a generation span
    const generation = trace.generation({
      name: 'chat-completion',
      model: providerUtils.getDefaultModel(provider),
      modelParameters: {
        temperature: defaultOptions.getDefaultOptions().temperature,
      },
    });

    const messages = [{ role: 'user', content: 'What is RAG?' }];

    const startTime = Date.now();
    const response =
      provider === 'openai' ? await client.chat(messages) : await client.chat(messages);

    const duration = Date.now() - startTime;

    const responseText = client.getTextContent(response);

    // End generation with output
    await generation.end({
      output: responseText,
      usage: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      metadata: {
        duration,
        provider,
      },
    });

    console.log(`\n📤 Response: ${responseText.substring(0, 150)}...`);
    console.log(`\n📊 Metrics:`);
    console.log(`  Duration: ${duration}ms`);
    if (response.usage) {
      console.log(`  Tokens: ${response.usage.total_tokens || 'N/A'}`);
    }

    // Traces are automatically completed in Langfuse, no need to call end()
  } catch (error) {
    // Check for Langfuse auth errors
    if (
      error.message?.includes('401') ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Invalid credentials')
    ) {
      console.log('\n⚠️  Langfuse authentication error detected.');
      console.log('💡 Verify LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, and LANGFUSE_HOST');
      console.log('💡 For self-hosted: Ensure host URL is correct and NEXTAUTH_URL matches');
      throw error;
    }

    if (trace && typeof trace.event === 'function') {
      try {
        await trace.event({
          name: 'error',
          level: 'ERROR',
          data: { error: error.message },
        });
      } catch (eventError) {
        // If event also fails (e.g., auth issue), just log it
        console.log('  ⚠️  Could not log event to Langfuse');
      }
    }
    throw error;
  }
}

/**
 * Example 2: Multi-Step Workflow Tracing
 */
async function multiStepTracingExample() {
  console.log('\n\n2️⃣ Multi-Step Workflow Tracing');
  console.log('='.repeat(60));

  if (!langfuse) {
    throw new Error(
      'Langfuse not initialized. Please configure LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY.'
    );
  }

  const trace = langfuse.trace({
    name: 'multi-step-workflow',
    metadata: {
      example: 'multi-step',
      workflow: 'research-analysis-synthesis',
    },
  });

  try {
    const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
    const client = createAIClient(provider);

    // Step 1: Research
    console.log('\n📚 Step 1: Research');
    const researchSpan = trace.span({
      name: 'research-phase',
      metadata: { phase: 'research' },
    });

    const researchPrompt = 'Research information about AI agents and their applications.';
    const researchResponse = await client.chat([{ role: 'user', content: researchPrompt }]);
    const researchText =
      provider === 'openai'
        ? researchResponse.choices[0].message.content
        : client.getTextContent(researchResponse);

    await researchSpan.end({ output: researchText.substring(0, 200) });

    // Step 2: Analysis
    console.log('\n📊 Step 2: Analysis');
    const analysisSpan = trace.span({
      name: 'analysis-phase',
      metadata: { phase: 'analysis' },
    });

    const analysisPrompt = `Analyze this research: "${researchText.substring(0, 100)}..." and provide key insights.`;
    const analysisResponse = await client.chat([{ role: 'user', content: analysisPrompt }]);
    const analysisText =
      provider === 'openai'
        ? analysisResponse.choices[0].message.content
        : client.getTextContent(analysisResponse);

    await analysisSpan.end({ output: analysisText.substring(0, 200) });

    // Step 3: Synthesis
    console.log('\n🔗 Step 3: Synthesis');
    const synthesisSpan = trace.span({
      name: 'synthesis-phase',
      metadata: { phase: 'synthesis' },
    });

    const synthesisPrompt = `Synthesize the research and analysis into a comprehensive summary.`;
    const synthesisResponse = await client.chat([{ role: 'user', content: synthesisPrompt }]);
    const synthesisText =
      provider === 'openai'
        ? synthesisResponse.choices[0].message.content
        : client.getTextContent(synthesisResponse);

    await synthesisSpan.end({ output: synthesisText.substring(0, 200) });

    console.log(`\n✅ Workflow completed`);
    console.log(`   Research: ${researchText.substring(0, 50)}...`);
    console.log(`   Analysis: ${analysisText.substring(0, 50)}...`);
    console.log(`   Synthesis: ${synthesisText.substring(0, 50)}...`);

    // Traces are automatically completed in Langfuse
  } catch (error) {
    if (trace && typeof trace.event === 'function') {
      await trace.event({
        name: 'error',
        level: 'ERROR',
        data: { error: error.message },
      });
    }
    throw error;
  }
}

/**
 * Example 3: Scoring and Feedback
 */
async function scoringExample() {
  console.log('\n\n3️⃣ Scoring and Feedback');
  console.log('='.repeat(60));

  if (!langfuse) {
    throw new Error(
      'Langfuse not initialized. Please configure LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY.'
    );
  }

  const trace = langfuse.trace({
    name: 'scoring-example',
    metadata: { example: 'scoring' },
  });

  try {
    const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
    const client = createAIClient(provider);

    const prompt = 'Explain quantum computing in simple terms.';
    console.log(`\n📥 Query: "${prompt}"`);

    const generation = trace.generation({
      name: 'explanation-generation',
    });

    const response = await client.chat([{ role: 'user', content: prompt }]);
    const responseText = client.getTextContent(response);

    await generation.end({ output: responseText });

    console.log(`\n📤 Response: ${responseText.substring(0, 150)}...`);

    // Add scores
    console.log('\n📊 Adding scores...');

    // Quality score
    await langfuse.score({
      traceId: trace.id,
      name: 'quality',
      value: 0.85,
      comment: 'Clear and accurate explanation',
    });

    // Relevance score
    await langfuse.score({
      traceId: trace.id,
      name: 'relevance',
      value: 0.9,
      comment: 'Highly relevant to the query',
    });

    // Clarity score
    await langfuse.score({
      traceId: trace.id,
      name: 'clarity',
      value: 0.88,
      comment: 'Easy to understand',
    });

    console.log('  ✅ Quality: 0.85');
    console.log('  ✅ Relevance: 0.90');
    console.log('  ✅ Clarity: 0.88');

    // Traces are automatically completed in Langfuse
  } catch (error) {
    if (trace && typeof trace.event === 'function') {
      await trace.event({
        name: 'error',
        level: 'ERROR',
        data: { error: error.message },
      });
    }
    throw error;
  }
}

/**
 * Example 4: Error Tracking
 */
async function errorTrackingExample() {
  console.log('\n\n4️⃣ Error Tracking');
  console.log('='.repeat(60));

  if (!langfuse) {
    throw new Error(
      'Langfuse not initialized. Please configure LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY.'
    );
  }

  const trace = langfuse.trace({
    name: 'error-tracking-example',
    metadata: { example: 'error-tracking' },
  });

  try {
    // Simulate an error scenario
    console.log('\n⚠️  Simulating error scenario...');

    const errorSpan = trace.span({
      name: 'risky-operation',
      metadata: { operation: 'data-processing' },
    });

    // Simulate an error
    try {
      throw new Error('Simulated processing error');
    } catch (error) {
      await trace.event({
        name: 'error',
        level: 'ERROR',
        data: {
          error: error.message,
          stack: error.stack,
          context: 'Data processing failed',
        },
      });

      await errorSpan.end({
        output: null,
        level: 'ERROR',
        statusMessage: error.message,
      });

      console.log(`  ❌ Error captured: ${error.message}`);
    }

    // Continue with recovery
    console.log('\n🔄 Attempting recovery...');
    const recoverySpan = trace.span({
      name: 'recovery-operation',
      metadata: { operation: 'fallback' },
    });

    await recoverySpan.end({
      output: 'Fallback mechanism activated successfully',
    });

    console.log('  ✅ Recovery successful');

    // Traces are automatically completed in Langfuse
  } catch (error) {
    if (trace && typeof trace.event === 'function') {
      await trace.event({
        name: 'fatal-error',
        level: 'ERROR',
        data: { error: error.message },
      });
    }
    throw error;
  }
}

/**
 * Example 5: Batch Processing with Tracing
 */
async function batchTracingExample() {
  console.log('\n\n5️⃣ Batch Processing with Tracing');
  console.log('='.repeat(60));

  if (!langfuse) {
    throw new Error(
      'Langfuse not initialized. Please configure LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY.'
    );
  }

  const batchTrace = langfuse.trace({
    name: 'batch-processing',
    metadata: {
      example: 'batch',
      batchSize: 3,
    },
  });

  try {
    const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
    const client = createAIClient(provider);

    const queries = [
      'What is machine learning?',
      'Explain neural networks',
      'What is deep learning?',
    ];

    console.log(`\n📦 Processing ${queries.length} queries in batch...\n`);

    const results = await Promise.all(
      queries.map(async (query, index) => {
        const itemSpan = batchTrace.span({
          name: `batch-item-${index + 1}`,
          metadata: { queryIndex: index, query },
        });

        try {
          const response = await client.chat([{ role: 'user', content: query }]);
          const responseText = client.getTextContent(response);

          await itemSpan.end({
            output: responseText.substring(0, 100),
            metadata: {
              success: true,
              tokens: response.usage?.total_tokens || 0,
            },
          });

          console.log(`  ✅ Item ${index + 1}: ${query.substring(0, 40)}...`);

          return { query, success: true, response: responseText };
        } catch (error) {
          await itemSpan.end({
            output: null,
            level: 'ERROR',
            statusMessage: error.message,
          });

          console.log(`  ❌ Item ${index + 1}: Failed - ${error.message}`);

          return { query, success: false, error: error.message };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    console.log(`\n📊 Batch Results: ${successCount}/${queries.length} successful`);

    // Update trace with final results if update method exists
    if (batchTrace && typeof batchTrace.update === 'function') {
      await batchTrace.update({
        output: {
          total: queries.length,
          successful: successCount,
          failed: queries.length - successCount,
        },
      });
    }

    // Traces are automatically completed in Langfuse
  } catch (error) {
    if (batchTrace && typeof batchTrace.event === 'function') {
      await batchTrace.event({
        name: 'batch-error',
        level: 'ERROR',
        data: { error: error.message },
      });
    }
    throw error;
  }
}

/**
 * Main example function
 */
async function langfuseExample() {
  console.log('=== Langfuse Example ===');
  console.log('LLM Observability, Tracing, and Monitoring\n');

  // Initialize Langfuse
  langfuse = initializeLangfuse();

  if (!langfuse) {
    throw new Error('Failed to initialize Langfuse. Please check your configuration.');
  }

  try {
    // Example 1: Basic tracing
    await basicTracingExample();

    // Example 2: Multi-step workflow
    await multiStepTracingExample();

    // Example 3: Scoring
    await scoringExample();

    // Example 4: Error tracking
    await errorTrackingExample();

    // Example 5: Batch processing
    await batchTracingExample();

    // Flush any pending events to ensure all traces are sent
    if (langfuse) {
      if (typeof langfuse.flushAsync === 'function') {
        await langfuse.flushAsync();
      } else if (typeof langfuse.flush === 'function') {
        await langfuse.flush();
      }
    }

    console.log('\n\n✅ All Langfuse examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Trace LLM calls and workflows');
    console.log('  - Monitor spans and generations');
    console.log('  - Track errors and events');
    console.log('  - Score outputs with feedback');
    console.log('  - Batch processing observability');
    console.log('\n🌐 View traces at: https://cloud.langfuse.com (or your self-hosted instance)');
  } catch (error) {
    console.error('\n❌ Error:', error.message);

    // Check for authentication/authorization errors
    if (
      error.message.includes('401') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Invalid credentials') ||
      error.message.includes("Invalid credentials. Confirm that you've configured the correct host")
    ) {
      console.log('\n🔐 Langfuse Authentication Error Detected');
      console.log('\n💡 Troubleshooting Steps:');
      console.log('   1. Verify LANGFUSE_SECRET_KEY is correct');
      console.log('   2. Verify LANGFUSE_PUBLIC_KEY is correct');
      console.log('   3. Check LANGFUSE_HOST matches your instance:');
      console.log('      - Cloud: https://cloud.langfuse.com (default)');
      console.log('      - Self-hosted: Your instance URL (e.g., https://langfuse.yourdomain.com)');
      console.log('   4. Ensure host URL has correct protocol (https://) and no trailing slash');
      console.log('   5. For self-hosted: Verify NEXTAUTH_URL matches your access URL');
    } else if (error.message.includes('API key')) {
      console.log('\n💡 Tip: Set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY for real tracing');
    }
  }
}

// Run the example
langfuseExample().catch(console.error);
