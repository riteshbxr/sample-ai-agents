/**
 * =============================================================================
 * 🎓 BEGINNER TUTORIAL #2: Chat with Context - Teaching AI How to Behave
 * =============================================================================
 *
 * In the first tutorial, we just said "hello" to the AI.
 * Now we'll learn how to give the AI instructions on HOW to respond.
 *
 * WHAT YOU'LL LEARN:
 * - System prompts: How to tell the AI what role to play
 * - Conversation history: How AI remembers what you said
 * - Temperature: How to control creativity vs consistency
 *
 * REAL-WORLD USE: Customer support bots, FAQ assistants, etc.
 *
 * RUN THIS: npm run demo:chat-context
 */

import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';

async function chatWithContext() {
  console.log('🎓 BEGINNER TUTORIAL #2: Chat with Context');
  console.log('='.repeat(50));
  console.log('');

  // Check if AI is available
  if (!providerUtils.isProviderAvailable('openai')) {
    console.log('❌ No AI provider available. Please set up your API key.');
    return;
  }

  const client = createAIClient('openai');

  // ==========================================================================
  // CONCEPT 1: THE SYSTEM PROMPT
  // ==========================================================================
  // A "system prompt" tells the AI WHO it should be and HOW to behave
  // Think of it as giving the AI a job description before it starts working
  //
  // This is SUPER IMPORTANT for customer experience applications!
  // It's how you turn a generic AI into YOUR company's support bot

  console.log('📋 CONCEPT 1: SYSTEM PROMPTS');
  console.log('-'.repeat(50));
  console.log('');
  console.log("A system prompt defines the AI's personality and behavior.");
  console.log("Let's see the difference with and without one...");
  console.log('');

  // WITHOUT a system prompt - generic response
  console.log('❌ WITHOUT System Prompt:');
  const messagesNoSystem = [{ role: 'user', content: "What's the return policy?" }];

  let response = await client.chat(messagesNoSystem);
  console.log(`   User: "What's the return policy?"`);
  console.log(`   AI: "${client.getTextContent(response).substring(0, 150)}..."`);
  console.log('');

  // WITH a system prompt - personalized response
  console.log('✅ WITH System Prompt (as a friendly store assistant):');
  const messagesWithSystem = [
    {
      // =======================================================================
      // THE SYSTEM MESSAGE - This is the magic!
      // =======================================================================
      // "system" role gives instructions that the AI follows throughout
      // the conversation. The AI will "become" whatever you describe here.
      role: 'system',
      content: `You are a friendly customer support agent for "TechGadgets Store".
Your name is Alex. You're helpful, cheerful, and always use the customer's name when possible.

Our return policy:
- 30-day returns for all items
- Free returns with prepaid label
- Refunds within 3-5 business days

Always be warm and helpful. End responses by asking if there's anything else you can help with.`,
    },
    {
      role: 'user',
      content: "Hi, my name is Sarah. What's the return policy?",
    },
  ];

  response = await client.chat(messagesWithSystem);
  console.log(`   User: "Hi, my name is Sarah. What's the return policy?"`);
  console.log(`   AI: "${client.getTextContent(response)}"`);
  console.log('');

  // ==========================================================================
  // CONCEPT 2: CONVERSATION HISTORY
  // ==========================================================================
  // AI can remember previous messages if you include them!
  // This creates natural back-and-forth conversations.

  console.log('');
  console.log('📋 CONCEPT 2: CONVERSATION HISTORY');
  console.log('-'.repeat(50));
  console.log('');
  console.log('AI remembers previous messages if you include them.');
  console.log('This creates natural multi-turn conversations...');
  console.log('');

  // Let's have a multi-turn conversation
  const conversation = [
    {
      role: 'system',
      content: `You are a helpful assistant for a coffee shop called "Bean There".
You help customers with menu questions and orders.
Be friendly and use coffee-related puns occasionally. ☕`,
    },
    // First message from user
    {
      role: 'user',
      content: "What's your most popular drink?",
    },
  ];

  // Get first response
  console.log('Turn 1:');
  console.log(`   Customer: "${conversation[1].content}"`);
  response = await client.chat(conversation);
  let aiResponse = client.getTextContent(response);
  console.log(`   Barista: "${aiResponse}"`);

  // =======================================================================
  // IMPORTANT: Add the AI's response to the conversation history
  // =======================================================================
  // This is how the AI "remembers" what it said!
  conversation.push({
    role: 'assistant', // "assistant" = the AI's previous messages
    content: aiResponse,
  });

  // Now ask a follow-up question
  conversation.push({
    role: 'user',
    content: 'Great! Can I get that with oat milk?',
  });

  console.log('');
  console.log('Turn 2 (follow-up - AI remembers the context!):');
  console.log(`   Customer: "Great! Can I get that with oat milk?"`);
  response = await client.chat(conversation);
  aiResponse = client.getTextContent(response);
  console.log(`   Barista: "${aiResponse}"`);
  console.log('');

  // ==========================================================================
  // CONCEPT 3: TEMPERATURE
  // ==========================================================================
  // Temperature controls how "creative" vs "consistent" the AI is
  // Lower = more predictable, Higher = more creative

  console.log('');
  console.log('📋 CONCEPT 3: TEMPERATURE');
  console.log('-'.repeat(50));
  console.log('');
  console.log('Temperature controls creativity (0.0 = focused, 1.0 = creative)');
  console.log('');

  const testMessages = [
    { role: 'user', content: 'Write a one-line greeting for a customer named Alex.' },
  ];

  // Low temperature - consistent, predictable
  console.log('🧊 Low Temperature (0.1) - Consistent & Predictable:');
  for (let i = 0; i < 2; i++) {
    response = await client.chat(testMessages, { temperature: 0.1 });
    console.log(`   Try ${i + 1}: "${client.getTextContent(response)}"`);
  }

  console.log('');

  // High temperature - creative, varied
  console.log('🔥 High Temperature (0.9) - Creative & Varied:');
  for (let i = 0; i < 2; i++) {
    response = await client.chat(testMessages, { temperature: 0.9 });
    console.log(`   Try ${i + 1}: "${client.getTextContent(response)}"`);
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('');
  console.log('='.repeat(50));
  console.log('🎉 GREAT JOB! You learned 3 key concepts!');
  console.log('');
  console.log('📚 SUMMARY:');
  console.log('');
  console.log('1. SYSTEM PROMPT');
  console.log("   - Defines AI's personality, role, and knowledge");
  console.log('   - Essential for customer experience apps');
  console.log("   - Example: Turn AI into your store's support agent");
  console.log('');
  console.log('2. CONVERSATION HISTORY');
  console.log('   - Include previous messages for context');
  console.log('   - Always add AI responses back to history');
  console.log('   - Enables natural multi-turn conversations');
  console.log('');
  console.log('3. TEMPERATURE');
  console.log('   - 0.0-0.3: Consistent (good for facts, support)');
  console.log('   - 0.4-0.7: Balanced (good for general chat)');
  console.log('   - 0.8-1.0: Creative (good for brainstorming)');
  console.log('');
  console.log('👉 NEXT: Try demo:customer-support to see a complete');
  console.log('   customer support chatbot example!');
}

// Run the example
chatWithContext().catch(console.error);
