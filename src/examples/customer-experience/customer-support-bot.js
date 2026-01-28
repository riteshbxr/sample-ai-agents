/**
 * =============================================================================
 * 🛍️ CUSTOMER SUPPORT CHATBOT
 * =============================================================================
 *
 * A complete, easy-to-understand customer support chatbot example.
 * This is one of the most common uses of AI for customer experience!
 *
 * FEATURES:
 * ✅ Friendly, branded personality
 * ✅ Product knowledge
 * ✅ Order lookup (simulated)
 * ✅ Common question handling
 * ✅ Escalation to human support
 *
 * WHAT YOU'LL LEARN:
 * - How to create a branded support experience
 * - How to integrate AI with your business data
 * - Best practices for customer-facing AI
 *
 * RUN THIS: npm run demo:customer-support
 */

import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';

// =============================================================================
// STEP 1: DEFINE YOUR BUSINESS DATA
// =============================================================================
// In a real app, this would come from your database or API
// For this example, we're using simple objects

/**
 * Your company's product catalog
 * In production: This would be fetched from your database
 */
const PRODUCTS = {
  'PHONE-X1': {
    name: 'SmartPhone X1',
    price: 599,
    description: 'Our flagship smartphone with 5G',
    inStock: true,
  },
  'LAPTOP-PRO': {
    name: 'LaptopPro 15',
    price: 1299,
    description: '15-inch professional laptop',
    inStock: true,
  },
  'EARBUDS-MINI': {
    name: 'EarBuds Mini',
    price: 79,
    description: 'Wireless earbuds with noise cancellation',
    inStock: false,
  },
};

/**
 * Sample customer orders
 * In production: This would be fetched from your order management system
 */
const ORDERS = {
  'ORD-12345': {
    customer: 'Sarah',
    product: 'SmartPhone X1',
    status: 'Shipped',
    trackingNumber: 'TRK-789456',
    estimatedDelivery: 'Tomorrow by 5 PM',
  },
  'ORD-67890': {
    customer: 'Mike',
    product: 'LaptopPro 15',
    status: 'Processing',
    trackingNumber: null,
    estimatedDelivery: '3-5 business days',
  },
};

/**
 * Your company policies
 * These are included in the system prompt so the AI knows your rules
 */
const COMPANY_POLICIES = {
  returns: '30-day hassle-free returns. Free return shipping included.',
  warranty: '1-year manufacturer warranty on all products.',
  shipping: 'Free shipping on orders over $50. Standard delivery 3-5 days.',
  support: 'Email support@techstore.com or call 1-800-TECH-123',
};

// =============================================================================
// STEP 2: CREATE THE SYSTEM PROMPT
// =============================================================================
// This is where we define how our support bot behaves

/**
 * Creates the system prompt for our support bot
 * This is the "personality" and "knowledge" of your bot
 */
function createSystemPrompt() {
  return `You are "TechBot", a friendly and helpful customer support assistant for TechStore.

## YOUR PERSONALITY
- Be warm, friendly, and professional
- Use the customer's name when they provide it
- Keep responses concise but helpful (2-3 sentences when possible)
- Use emojis sparingly for warmth 😊

## WHAT YOU CAN HELP WITH
1. Product information and recommendations
2. Order status (when customer provides order number)
3. Return and refund questions
4. Shipping information
5. General questions about TechStore

## OUR PRODUCTS
${Object.entries(PRODUCTS)
  .map(
    ([_id, p]) =>
      `- ${p.name} ($${p.price}) - ${p.description} ${p.inStock ? '✓ In Stock' : '✗ Out of Stock'}`
  )
  .join('\n')}

## OUR POLICIES
- Returns: ${COMPANY_POLICIES.returns}
- Warranty: ${COMPANY_POLICIES.warranty}
- Shipping: ${COMPANY_POLICIES.shipping}

## IMPORTANT RULES
1. If you don't know something, say so honestly
2. For complex issues, offer to connect with a human agent
3. Never make up order information - ask for order number
4. Always end by asking if there's anything else you can help with

## ESCALATION
If the customer seems frustrated or the issue is complex, say:
"I want to make sure you get the best help possible. Would you like me to connect you with one of our support specialists?"`;
}

// =============================================================================
// STEP 3: CREATE HELPER FUNCTIONS
// =============================================================================
// These simulate looking up real data

/**
 * Look up an order by order number
 * In production: This would call your order management API
 */
function lookupOrder(orderNumber) {
  // Clean up the order number (remove spaces, make uppercase)
  const cleanOrderNumber = orderNumber.replace(/\s/g, '').toUpperCase();

  // Check our "database"
  if (ORDERS[cleanOrderNumber]) {
    return ORDERS[cleanOrderNumber];
  }

  // Also try with "ORD-" prefix
  if (ORDERS[`ORD-${cleanOrderNumber}`]) {
    return ORDERS[`ORD-${cleanOrderNumber}`];
  }

  return null;
}

/**
 * Check if message contains an order inquiry
 */
function extractOrderNumber(message) {
  // Look for patterns like "ORD-12345" or just "12345"
  const orderPattern = /(?:ORD-)?(\d{5})/i;
  const match = message.match(orderPattern);
  return match ? match[0] : null;
}

// =============================================================================
// STEP 4: THE MAIN SUPPORT BOT CLASS
// =============================================================================
// This wraps everything together into an easy-to-use class

/**
 * CustomerSupportBot - A complete support chatbot
 *
 * USAGE:
 *   const bot = new CustomerSupportBot();
 *   const response = await bot.chat("Hi, I need help with my order");
 */
class CustomerSupportBot {
  constructor() {
    // Initialize the AI client
    this.client = createAIClient('openai');

    // Store conversation history for context
    this.conversationHistory = [];

    // Add the system prompt
    this.conversationHistory.push({
      role: 'system',
      content: createSystemPrompt(),
    });
  }

  /**
   * Send a message to the bot and get a response
   * @param {string} userMessage - The customer's message
   * @returns {Promise<string>} - The bot's response
   */
  async chat(userMessage) {
    // =========================================================================
    // STEP A: Add customer message to history
    // =========================================================================
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // =========================================================================
    // STEP B: Check if they're asking about an order
    // =========================================================================
    // This is an example of "augmenting" the AI with real data
    const orderNumber = extractOrderNumber(userMessage);
    let additionalContext = '';

    if (orderNumber) {
      const orderInfo = lookupOrder(orderNumber);
      if (orderInfo) {
        // Add real order info to the conversation
        additionalContext = `\n\n[SYSTEM: Order ${orderNumber} found - Status: ${orderInfo.status}, Product: ${orderInfo.product}, Est. Delivery: ${orderInfo.estimatedDelivery}${orderInfo.trackingNumber ? `, Tracking: ${orderInfo.trackingNumber}` : ''}]`;
      } else {
        additionalContext = `\n\n[SYSTEM: Order ${orderNumber} not found in our system]`;
      }

      // Temporarily add context
      this.conversationHistory.push({
        role: 'system',
        content: additionalContext,
      });
    }

    // =========================================================================
    // STEP C: Get AI response
    // =========================================================================
    const response = await this.client.chat(this.conversationHistory, {
      temperature: 0.7, // Balanced - friendly but consistent
    });

    const botResponse = this.client.getTextContent(response);

    // =========================================================================
    // STEP D: Clean up and save to history
    // =========================================================================
    // Remove the temporary context
    if (additionalContext) {
      this.conversationHistory.pop();
    }

    // Save the bot's response
    this.conversationHistory.push({
      role: 'assistant',
      content: botResponse,
    });

    return botResponse;
  }

  /**
   * Reset the conversation (start fresh)
   */
  reset() {
    this.conversationHistory = [
      {
        role: 'system',
        content: createSystemPrompt(),
      },
    ];
  }
}

// =============================================================================
// STEP 5: DEMO THE BOT
// =============================================================================

async function customerSupportDemo() {
  console.log('🛍️ CUSTOMER SUPPORT BOT DEMO');
  console.log('='.repeat(60));
  console.log('');

  // Check if AI is available
  if (!providerUtils.isProviderAvailable('openai')) {
    console.log('❌ No AI provider available. Please set up your API key.');
    return;
  }

  // Create our support bot
  const bot = new CustomerSupportBot();

  console.log('📋 This demo shows a customer support conversation.');
  console.log('   The bot knows about products, orders, and policies.');
  console.log('');
  console.log('-'.repeat(60));

  // Sample conversation
  const conversations = [
    {
      customer: "Hi! I'm looking for a new phone. What do you recommend?",
      note: 'Product recommendation question',
    },
    {
      customer: "That sounds great! What's your return policy in case I don't like it?",
      note: 'Policy question (bot remembers previous context)',
    },
    {
      customer: 'I actually have an existing order. Can you check on order 12345?',
      note: 'Order lookup (bot fetches real order data)',
    },
    {
      customer: 'When will it arrive? I need it for a meeting tomorrow.',
      note: 'Follow-up question (bot uses order context)',
    },
  ];

  for (let i = 0; i < conversations.length; i++) {
    const { customer, note } = conversations[i];

    console.log('');
    console.log(`💡 Scenario: ${note}`);
    console.log('');
    console.log(`👤 Customer: "${customer}"`);
    console.log('');

    // Get bot response
    const response = await bot.chat(customer);

    console.log(`🤖 TechBot: "${response}"`);
    console.log('');
    console.log('-'.repeat(60));
  }

  // Show what we learned
  console.log('');
  console.log('='.repeat(60));
  console.log('📚 WHAT THIS EXAMPLE DEMONSTRATES:');
  console.log('');
  console.log('1. BRANDED PERSONALITY');
  console.log('   - The bot has a name (TechBot) and friendly tone');
  console.log("   - It follows your company's communication style");
  console.log('');
  console.log('2. PRODUCT KNOWLEDGE');
  console.log('   - Bot knows your products, prices, and availability');
  console.log('   - Can make recommendations based on customer needs');
  console.log('');
  console.log('3. DATA INTEGRATION');
  console.log('   - Looks up real order information');
  console.log('   - Augments AI responses with actual data');
  console.log('');
  console.log('4. CONVERSATION MEMORY');
  console.log('   - Remembers context from earlier in the chat');
  console.log('   - Can answer follow-up questions naturally');
  console.log('');
  console.log('5. POLICY ADHERENCE');
  console.log('   - Knows and correctly states company policies');
  console.log('   - Offers to escalate complex issues');
  console.log('');
  console.log('🚀 TO USE THIS IN YOUR PROJECT:');
  console.log('   1. Replace PRODUCTS with your real product data');
  console.log('   2. Connect lookupOrder() to your order management system');
  console.log('   3. Update the system prompt with your company info');
  console.log('   4. Add more helper functions for your specific needs');
}

// Export for use in other files
export { CustomerSupportBot, createSystemPrompt };

// Run the demo
customerSupportDemo().catch(console.error);
