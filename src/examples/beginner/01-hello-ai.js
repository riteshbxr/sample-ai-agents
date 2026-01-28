/**
 * =============================================================================
 * 🎓 BEGINNER TUTORIAL #1: Hello AI - Your First AI Conversation
 * =============================================================================
 *
 * This is the simplest possible example of talking to an AI.
 * Think of it like "Hello World" but for AI!
 *
 * WHAT YOU'LL LEARN:
 * - How to send a message to an AI
 * - How to get a response back
 * - The basic structure of AI conversations
 *
 * BEFORE YOU START:
 * 1. Make sure you have an API key set up (see .env file)
 * 2. Run: npm install (if you haven't already)
 * 3. Run this file: npm run demo:hello-ai
 */

// =============================================================================
// STEP 1: Import the tools we need
// =============================================================================
// We're importing a "client factory" - this creates a connection to the AI
import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';

// =============================================================================
// STEP 2: Create our main function
// =============================================================================
// In JavaScript, we wrap our code in an "async function" because
// talking to AI takes time (it's not instant like regular code)
async function helloAI() {
  // Print a friendly welcome message
  console.log('🎓 BEGINNER TUTORIAL #1: Hello AI');
  console.log('='.repeat(50));
  console.log('');

  // ==========================================================================
  // STEP 3: Check if we have access to an AI provider
  // ==========================================================================
  // First, we check if an AI service is available
  // (This checks if your API key is set up correctly)
  if (!providerUtils.isProviderAvailable('openai')) {
    console.log('❌ No AI provider available!');
    console.log('');
    console.log('To fix this, you need to set up an API key:');
    console.log('1. Copy env.example to .env');
    console.log('2. Add your OpenAI or Azure OpenAI API key');
    console.log('3. Run this example again');
    return;
  }

  console.log("✅ AI provider is available! Let's chat.\n");

  // ==========================================================================
  // STEP 4: Create a connection to the AI
  // ==========================================================================
  // This creates a "client" - think of it as opening a phone line to the AI
  const client = createAIClient('openai');

  // ==========================================================================
  // STEP 5: Create a message to send
  // ==========================================================================
  // AI conversations use a simple format:
  // - "role": Who is speaking? (user = you, assistant = AI, system = instructions)
  // - "content": What are they saying?
  //
  // This is called the "messages" array - it's like a chat history
  const messages = [
    {
      role: 'user', // This is YOU speaking
      content: 'Hello! What is your name and what can you help me with?',
    },
  ];

  console.log('📤 Sending message to AI...');
  console.log(`   You: "${messages[0].content}"`);
  console.log('');

  // ==========================================================================
  // STEP 6: Send the message and wait for a response
  // ==========================================================================
  // The "await" keyword means "wait for this to finish"
  // because the AI needs time to think and respond
  try {
    const response = await client.chat(messages);

    // ========================================================================
    // STEP 7: Get the AI's response
    // ========================================================================
    // The response comes back in a specific format
    // We use a helper method to extract just the text we need
    const aiMessage = client.getTextContent(response);

    console.log('📥 AI responded!');
    console.log(`   AI: "${aiMessage}"`);
    console.log('');

    // ========================================================================
    // STEP 8: Show what we learned
    // ========================================================================
    console.log('='.repeat(50));
    console.log('🎉 SUCCESS! You just had your first AI conversation!');
    console.log('');
    console.log('📚 KEY CONCEPTS YOU LEARNED:');
    console.log('');
    console.log('1. MESSAGES ARRAY');
    console.log('   - AI conversations are a list of messages');
    console.log('   - Each message has a "role" and "content"');
    console.log('   - Roles: user (you), assistant (AI), system (instructions)');
    console.log('');
    console.log('2. THE CHAT METHOD');
    console.log('   - client.chat(messages) sends your messages to the AI');
    console.log('   - It returns a response object');
    console.log('   - Use getTextContent() to extract the actual text');
    console.log('');
    console.log('3. ASYNC/AWAIT');
    console.log('   - AI calls take time, so we use "await"');
    console.log('   - This pauses the code until we get a response');
    console.log('');
    console.log('👉 NEXT STEP: Try demo:chat-with-context to learn about');
    console.log('   system prompts and conversation context!');
  } catch (error) {
    // If something goes wrong, we show a helpful error message
    console.log('❌ Oops! Something went wrong:');
    console.log(`   Error: ${error.message}`);
    console.log('');
    console.log('💡 COMMON FIXES:');
    console.log('   - Check that your API key is correct in .env file');
    console.log('   - Make sure you have internet connection');
    console.log('   - Check if you have API credits remaining');
  }
}

// =============================================================================
// STEP 9: Run our function
// =============================================================================
// This line actually runs the code above
helloAI().catch(console.error);
