/**
 * =============================================================================
 * 📚 FAQ / KNOWLEDGE BASE BOT
 * =============================================================================
 *
 * A simple FAQ bot that answers questions using your knowledge base.
 * This is a beginner-friendly introduction to RAG (Retrieval-Augmented Generation).
 *
 * WHAT IT DOES:
 * 1. Stores your FAQ/knowledge base content
 * 2. Finds the most relevant answers for customer questions
 * 3. Uses AI to provide natural, helpful responses
 *
 * PERFECT FOR:
 * - Website FAQ sections
 * - Help center bots
 * - Internal knowledge bases
 * - Product documentation
 *
 * RUN THIS: npm run demo:faq-bot
 */

import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';

// =============================================================================
// STEP 1: YOUR KNOWLEDGE BASE
// =============================================================================
// This is where you put your FAQ content
// Each item has a question, answer, and category for organization

/**
 * Sample FAQ Knowledge Base
 * In production, this could come from:
 * - Your CMS (Content Management System)
 * - A database
 * - Markdown files
 * - Your help center
 */
const FAQ_KNOWLEDGE_BASE = [
  // ACCOUNT & BILLING
  {
    id: 1,
    category: 'Account',
    question: 'How do I reset my password?',
    answer: `To reset your password:
1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for the reset link
5. Click the link and create a new password

The reset link expires in 24 hours. If you don't see the email, check your spam folder.`,
    keywords: ['password', 'reset', 'forgot', 'login', 'access'],
  },
  {
    id: 2,
    category: 'Account',
    question: 'How do I cancel my subscription?',
    answer: `You can cancel your subscription anytime:
1. Log into your account
2. Go to Settings > Subscription
3. Click "Cancel Subscription"
4. Follow the prompts to confirm

Your access continues until the end of your current billing period. You won't be charged again after cancellation.`,
    keywords: ['cancel', 'subscription', 'unsubscribe', 'stop', 'end'],
  },
  {
    id: 3,
    category: 'Billing',
    question: 'What payment methods do you accept?',
    answer: `We accept the following payment methods:
- Credit cards (Visa, MasterCard, American Express)
- Debit cards
- PayPal
- Apple Pay (on iOS devices)
- Google Pay (on Android devices)

All payments are processed securely through Stripe.`,
    keywords: ['payment', 'pay', 'credit card', 'billing', 'charge'],
  },

  // SHIPPING & DELIVERY
  {
    id: 4,
    category: 'Shipping',
    question: 'How long does shipping take?',
    answer: `Shipping times depend on your location and shipping method:
- Standard Shipping: 5-7 business days
- Express Shipping: 2-3 business days
- Next Day: Order by 2 PM for next business day delivery

Free shipping is available on orders over $50. You'll receive tracking information via email once your order ships.`,
    keywords: ['shipping', 'delivery', 'arrive', 'time', 'how long'],
  },
  {
    id: 5,
    category: 'Shipping',
    question: 'Do you ship internationally?',
    answer: `Yes! We ship to over 50 countries worldwide.

International shipping rates and times:
- Canada/Mexico: 5-10 business days
- Europe: 7-14 business days
- Asia/Pacific: 10-20 business days

Note: International orders may be subject to customs fees and import duties, which are the customer's responsibility.`,
    keywords: ['international', 'ship', 'country', 'overseas', 'abroad'],
  },

  // RETURNS & REFUNDS
  {
    id: 6,
    category: 'Returns',
    question: 'What is your return policy?',
    answer: `We offer a 30-day hassle-free return policy:
- Items must be unused and in original packaging
- Free return shipping within the US
- Refunds processed within 5-7 business days

To start a return:
1. Go to your Order History
2. Select the order
3. Click "Start Return"
4. Print the prepaid shipping label`,
    keywords: ['return', 'refund', 'money back', 'send back', 'exchange'],
  },

  // PRODUCT & TECHNICAL
  {
    id: 7,
    category: 'Product',
    question: 'Is the product waterproof?',
    answer: `Our products have different water resistance levels:
- Standard models: Water-resistant (splashes and rain)
- Pro models: Waterproof up to 1 meter for 30 minutes (IP67)
- Ultra models: Waterproof up to 2 meters for 30 minutes (IP68)

Check the product specifications for your specific model. Note: Water damage from exceeding these limits isn't covered by warranty.`,
    keywords: ['waterproof', 'water resistant', 'wet', 'swim', 'rain'],
  },
  {
    id: 8,
    category: 'Technical',
    question: 'How do I connect to Bluetooth?',
    answer: `To connect via Bluetooth:
1. Turn on your device
2. Enable Bluetooth on your phone/computer
3. Open Bluetooth settings
4. Look for your device name (e.g., "TechGadget-XXXX")
5. Tap to pair

Troubleshooting:
- Make sure the device is in pairing mode (usually a blinking blue light)
- Try turning Bluetooth off and on again
- Restart both devices if needed`,
    keywords: ['bluetooth', 'connect', 'pair', 'wireless', 'sync'],
  },
];

// =============================================================================
// STEP 2: SIMPLE SEARCH FUNCTION
// =============================================================================
// This finds the most relevant FAQ items for a question
// For a production app, you'd use embeddings (see RAG example for that)

/**
 * Simple keyword-based search
 * Finds FAQ items that match the customer's question
 *
 * @param {string} query - The customer's question
 * @param {number} maxResults - Maximum results to return (default: 3)
 * @returns {Array} Matching FAQ items sorted by relevance
 */
function searchFAQ(query, maxResults = 3) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // Score each FAQ item
  const scoredItems = FAQ_KNOWLEDGE_BASE.map((item) => {
    let score = 0;

    // Check keywords (highest priority)
    for (const keyword of item.keywords) {
      if (queryLower.includes(keyword)) {
        score += 10;
      }
    }

    // Check if query words appear in question
    for (const word of queryWords) {
      if (word.length > 3) {
        // Skip short words like "the", "how"
        if (item.question.toLowerCase().includes(word)) {
          score += 5;
        }
        if (item.answer.toLowerCase().includes(word)) {
          score += 2;
        }
      }
    }

    return { item, score };
  });

  // Sort by score and return top results
  return scoredItems
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.item);
}

// =============================================================================
// STEP 3: THE FAQ BOT CLASS
// =============================================================================

/**
 * FAQBot - Answers questions using your knowledge base
 *
 * This combines:
 * 1. Search: Find relevant FAQ content
 * 2. AI: Generate natural, helpful responses
 */
class FAQBot {
  constructor(options = {}) {
    this.client = createAIClient('openai');
    this.companyName = options.companyName || 'Our Company';
    this.botName = options.botName || 'Helper';
  }

  /**
   * Answer a customer's question
   * @param {string} question - The customer's question
   * @returns {Promise<Object>} Response with answer and sources
   */
  async answer(question) {
    // =========================================================================
    // STEP A: Search for relevant FAQ items
    // =========================================================================
    const relevantFAQs = searchFAQ(question);

    // =========================================================================
    // STEP B: Build the prompt with context
    // =========================================================================
    let contextText = '';

    if (relevantFAQs.length > 0) {
      contextText = `RELEVANT FAQ INFORMATION:
${relevantFAQs
  .map(
    (faq, i) => `
--- FAQ ${i + 1}: ${faq.question} ---
${faq.answer}
`
  )
  .join('\n')}

Based on this information, answer the customer's question naturally and helpfully.`;
    } else {
      contextText = `No specific FAQ matched this question. 
Politely let the customer know you don't have specific information about this, 
and suggest they contact support for more help.`;
    }

    const systemPrompt = `You are ${this.botName}, a helpful FAQ assistant for ${this.companyName}.

Your job is to:
1. Answer questions based on the FAQ information provided
2. Be friendly and concise
3. If the FAQ doesn't cover their question, be honest about it

Keep answers clear and easy to understand. Format with bullet points or numbered steps when helpful.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${contextText}\n\nCUSTOMER QUESTION: ${question}` },
    ];

    // =========================================================================
    // STEP C: Get AI response
    // =========================================================================
    const response = await this.client.chat(messages, {
      temperature: 0.3, // Lower temperature for more consistent, factual answers
    });

    const answer = this.client.getTextContent(response);

    // Return both the answer and the sources (for transparency)
    return {
      answer,
      sources: relevantFAQs.map((faq) => ({
        question: faq.question,
        category: faq.category,
      })),
      foundInFAQ: relevantFAQs.length > 0,
    };
  }
}

// =============================================================================
// STEP 4: DEMO
// =============================================================================

async function faqBotDemo() {
  console.log('📚 FAQ / KNOWLEDGE BASE BOT DEMO');
  console.log('='.repeat(60));
  console.log('');

  if (!providerUtils.isProviderAvailable('openai')) {
    console.log('❌ No AI provider available. Please set up your API key.');
    return;
  }

  // Create the FAQ bot
  const bot = new FAQBot({
    companyName: 'TechStore',
    botName: 'FAQ Helper',
  });

  // Sample questions to test
  const testQuestions = [
    {
      question: 'I forgot my password, what should I do?',
      note: 'Direct FAQ match',
    },
    {
      question: 'How much is shipping to Canada?',
      note: 'Related to international shipping FAQ',
    },
    {
      question: 'Can I return something after 45 days?',
      note: 'Tests understanding of return policy',
    },
    {
      question: 'Do you have a store in New York?',
      note: 'Not covered by FAQ - should handle gracefully',
    },
  ];

  console.log('This bot answers questions using a knowledge base.');
  console.log("Let's test it with some sample questions...");
  console.log('');
  console.log('-'.repeat(60));

  for (const { question, note } of testQuestions) {
    console.log('');
    console.log(`💡 Test: ${note}`);
    console.log(`❓ Question: "${question}"`);
    console.log('');

    const result = await bot.answer(question);

    console.log(`💬 Answer: ${result.answer}`);
    console.log('');

    if (result.sources.length > 0) {
      console.log(`📎 Sources used:`);
      for (const source of result.sources) {
        console.log(`   - [${source.category}] ${source.question}`);
      }
    } else {
      console.log(`📎 No specific FAQ matched`);
    }

    console.log('');
    console.log('-'.repeat(60));
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('📚 HOW THIS WORKS:');
  console.log('');
  console.log('1. KNOWLEDGE BASE');
  console.log('   - FAQ content is stored in a structured format');
  console.log('   - Each item has question, answer, and keywords');
  console.log('');
  console.log('2. SEARCH');
  console.log('   - When customer asks a question, we search the FAQ');
  console.log('   - Keyword matching finds relevant content');
  console.log('   - (For better matching, use embeddings - see RAG example)');
  console.log('');
  console.log('3. AI RESPONSE');
  console.log('   - Found FAQ content is given to the AI');
  console.log('   - AI creates a natural, helpful answer');
  console.log('   - Sources are tracked for transparency');
  console.log('');
  console.log('🚀 NEXT STEPS:');
  console.log('   - Replace FAQ_KNOWLEDGE_BASE with your content');
  console.log('   - For large knowledge bases, use embeddings (demo:rag)');
  console.log('   - Add categories for better organization');
}

// Export for use in other files
export { FAQBot, searchFAQ, FAQ_KNOWLEDGE_BASE };

// Run the demo
faqBotDemo().catch(console.error);
