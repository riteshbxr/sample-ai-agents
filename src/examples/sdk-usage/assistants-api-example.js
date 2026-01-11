import { createAIClient } from '../../clients/client-factory.js';

/**
 * OpenAI Assistants API Example
 * Demonstrates persistent AI assistants with thread management
 * Different from function calling - assistants maintain state across conversations
 */
async function assistantsAPIExample() {
  console.log('=== OpenAI Assistants API Example ===\n');

  // Check if using Azure OpenAI (Assistants API is not supported on Azure)
  if (process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_API_KEY) {
    console.log('⚠️  Assistants API is not available with Azure OpenAI.');
    console.log("   The Assistants API is only available through OpenAI's direct API.");
    console.log('\n💡 To use Assistants API:');
    console.log('   1. Use OPENAI_API_KEY (not AZURE_OPENAI_API_KEY)');
    console.log('   2. Remove AZURE_OPENAI_ENDPOINT from your .env file');
    console.log('   3. Set OPENAI_API_KEY with your OpenAI API key');
    console.log('\n   Note: Azure OpenAI supports function calling, but not the Assistants API.');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OpenAI API key required for Assistants API example');
    console.log('   Please set OPENAI_API_KEY in your .env file');
    console.log('   Note: Azure OpenAI does not support Assistants API');
    return;
  }

  const openaiClient = createAIClient('openai');

  try {
    // Step 1: Create an Assistant
    console.log('1️⃣ Creating an Assistant...');
    console.log('-'.repeat(60));

    const assistant = await openaiClient.createAssistant(
      `You are a helpful coding assistant for a startup. 
      You help developers with:
      - Code reviews
      - Debugging
      - Best practices
      - Architecture decisions
      
      Always provide clear, concise answers with code examples when relevant.`,
      [
        {
          type: 'function',
          function: {
            name: 'searchDocumentation',
            description: 'Search code documentation',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
        },
      ]
    );

    console.log(`✅ Assistant created: ${assistant.id}`);
    console.log(`   Name: ${assistant.name}`);
    console.log(`   Model: ${assistant.model}`);
    console.log(`   Tools: ${assistant.tools.length}\n`);

    // Step 2: Create a Thread
    console.log('2️⃣ Creating a Thread...');
    console.log('-'.repeat(60));

    const thread = await openaiClient.createThread();
    console.log(`✅ Thread created: ${thread.id}\n`);

    // Step 3: Add messages and run the assistant
    console.log('3️⃣ Running Assistant on Thread...');
    console.log('-'.repeat(60));

    const userMessage = 'What are the best practices for error handling in Node.js?';
    console.log(`👤 User: ${userMessage}\n`);

    // Add message to thread
    await openaiClient.client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage,
    });

    // Run the assistant
    let run = await openaiClient.client.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    console.log(`🔄 Run started: ${run.id}`);
    console.log(`   Status: ${run.status}\n`);

    // Poll for completion
    while (run.status === 'queued' || run.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await openaiClient.client.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(`   Status: ${run.status}...`);
    }

    if (run.status === 'completed') {
      console.log('✅ Run completed!\n');

      // Retrieve messages
      const messages = await openaiClient.client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');

      if (assistantMessage) {
        const content = assistantMessage.content[0];
        if (content.type === 'text') {
          console.log('🤖 Assistant Response:');
          console.log('-'.repeat(60));
          console.log(content.text.value);
        }
      }
    } else {
      console.log(`❌ Run failed with status: ${run.status}`);
    }

    console.log('\n');

    // Step 4: Continue conversation
    console.log('4️⃣ Continuing Conversation...');
    console.log('-'.repeat(60));

    const followUp = 'Can you provide a code example?';
    console.log(`👤 User: ${followUp}\n`);

    await openaiClient.client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: followUp,
    });

    run = await openaiClient.client.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    while (run.status === 'queued' || run.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await openaiClient.client.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (run.status === 'completed') {
      const messages = await openaiClient.client.beta.threads.messages.list(thread.id);
      const latestMessage = messages.data.find((msg) => msg.role === 'assistant');

      if (latestMessage) {
        const content = latestMessage.content[0];
        if (content.type === 'text') {
          console.log('🤖 Assistant Response:');
          console.log('-'.repeat(60));
          console.log(content.text.value.substring(0, 300) + '...');
        }
      }
    }

    console.log('\n');

    // Step 5: List all messages in thread
    console.log('5️⃣ Thread History:');
    console.log('-'.repeat(60));

    const allMessages = await openaiClient.client.beta.threads.messages.list(thread.id);
    console.log(`Total messages in thread: ${allMessages.data.length}`);
    allMessages.data.forEach((msg, idx) => {
      console.log(`\n${idx + 1}. ${msg.role.toUpperCase()}:`);
      if (msg.content[0].type === 'text') {
        console.log(`   ${msg.content[0].text.value.substring(0, 100)}...`);
      }
    });

    console.log('\n💡 Key Differences from Function Calling:');
    console.log('-'.repeat(60));
    console.log('1. Assistants maintain persistent state across conversations');
    console.log('2. Threads allow multi-turn conversations with context');
    console.log('3. Assistants can be reused across multiple threads');
    console.log('4. Better for long-running conversations and support systems');
    console.log('5. Built-in message history management');
  } catch (error) {
    console.error('❌ Error:', error.message);

    if (
      error.status === 404 ||
      error.message.includes('404') ||
      error.message.includes('not found')
    ) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Assistants API is only available with OpenAI (not Azure OpenAI)');
      console.log("   2. Make sure you're using OPENAI_API_KEY (not AZURE_OPENAI_API_KEY)");
      console.log('   3. Check that your API key has access to Assistants API');
      console.log("   4. Ensure you're using a recent API version that supports Assistants");
    } else if (error.message.includes('assistants') || error.message.includes('beta')) {
      console.log('\n💡 Note: Assistants API requires:');
      console.log('   - OpenAI direct API (not Azure OpenAI)');
      console.log('   - OPENAI_API_KEY environment variable');
      console.log('   - API access to beta features');
    }

    // Check if Azure is being used
    if (process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_API_KEY) {
      console.log('\n⚠️  Detected Azure OpenAI configuration.');
      console.log('   Assistants API is not supported on Azure OpenAI.');
      console.log('   Please use OPENAI_API_KEY instead for Assistants API.');
    }
  }
}

assistantsAPIExample().catch(console.error);
