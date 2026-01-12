import { AssistantsService } from '../../services/assistants-service.js';
import { config } from '../../config.js';

/**
 * OpenAI Assistants API Example
 * Demonstrates persistent AI assistants with thread management
 * Different from function calling - assistants maintain state across conversations
 */
async function assistantsAPIExample() {
  console.log('=== OpenAI Assistants API Example ===\n');

  // Check if standard OpenAI API key is available
  if (!config.openai.standardApiKey) {
    if (config.openai.azure.enabled) {
      console.log('⚠️  Assistants API is not available with Azure OpenAI.');
      console.log("   The Assistants API is only available through OpenAI's direct API.");
      console.log('\n💡 To use Assistants API:');
      console.log('   1. Set OPENAI_API_KEY (not just AZURE_OPENAI_API_KEY)');
      console.log('   2. You can keep AZURE_OPENAI_ENDPOINT for other examples');
      console.log('   3. The Assistants API will use OPENAI_API_KEY automatically');
      console.log('\n   Note: Azure OpenAI supports function calling, but not the Assistants API.');
    } else {
      console.log('⚠️  OpenAI API key required for Assistants API example');
      console.log('   Please set OPENAI_API_KEY in your .env file');
    }
    return;
  }

  // If Azure is enabled but standard key exists, warn but allow
  if (config.openai.azure.enabled) {
    console.log(
      'ℹ️  Note: Azure OpenAI is configured, but using standard OpenAI for Assistants API.'
    );
    console.log('   Assistants API requires OPENAI_API_KEY (not Azure OpenAI).\n');
  }

  const assistantsService = new AssistantsService();

  try {
    // Step 1: Create an Assistant
    console.log('1️⃣ Creating an Assistant...');
    console.log('-'.repeat(60));

    const assistant = await assistantsService.createAssistant(
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

    const thread = await assistantsService.createThread();
    console.log(`✅ Thread created: ${thread.id}\n`);

    // Step 3: Add messages and run the assistant
    console.log('3️⃣ Running Assistant on Thread...');
    console.log('-'.repeat(60));

    const userMessage = 'What are the best practices for error handling in Node.js?';
    console.log(`👤 User: ${userMessage}\n`);

    // Add message to thread
    await assistantsService.addMessage(thread.id, userMessage, 'user');

    // Run the assistant
    const response = await assistantsService.completeConversation(
      thread.id,
      assistant.id,
      userMessage
    );

    console.log(`🔄 Run completed!\n`);

    if (response) {
      console.log('✅ Run completed!\n');

      // Retrieve messages
      const messages = await assistantsService.getMessages(thread.id);
      const assistantMessage = messages.find((msg) => msg.role === 'assistant');

      if (assistantMessage) {
        console.log('🤖 Assistant Response:');
        console.log('-'.repeat(60));
        console.log(response);
      }
    }

    console.log('\n');

    // Step 4: Continue conversation
    console.log('4️⃣ Continuing Conversation...');
    console.log('-'.repeat(60));

    const followUp = 'Can you provide a code example?';
    console.log(`👤 User: ${followUp}\n`);

    const followUpResponse = await assistantsService.completeConversation(
      thread.id,
      assistant.id,
      followUp
    );

    if (followUpResponse) {
      console.log('🤖 Assistant Response:');
      console.log('-'.repeat(60));
      console.log(followUpResponse.substring(0, 300) + '...');
    }

    console.log('\n');

    // Step 5: List all messages in thread
    console.log('5️⃣ Thread History:');
    console.log('-'.repeat(60));

    const allMessages = await assistantsService.getMessages(thread.id);
    console.log(`Total messages in thread: ${allMessages.length}`);
    allMessages.forEach((msg, idx) => {
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
    if (config.openai.azure.enabled) {
      console.log('\n⚠️  Detected Azure OpenAI configuration.');
      console.log('   Assistants API is not supported on Azure OpenAI.');
      console.log('   Please use OPENAI_API_KEY instead for Assistants API.');
    }
  }
}

assistantsAPIExample().catch(console.error);
