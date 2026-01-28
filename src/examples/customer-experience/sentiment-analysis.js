/**
 * =============================================================================
 * 😊 SENTIMENT ANALYSIS FOR CUSTOMER FEEDBACK
 * =============================================================================
 *
 * Analyze customer feedback to understand how they feel about your product/service.
 * This is essential for improving customer experience!
 *
 * WHAT YOU'LL LEARN:
 * - How to analyze sentiment (positive/negative/neutral)
 * - How to extract key topics from feedback
 * - How to prioritize urgent issues
 * - How to generate response suggestions
 *
 * USE CASES:
 * - Product reviews analysis
 * - Support ticket triage
 * - Survey response analysis
 * - Social media monitoring
 *
 * RUN THIS: npm run demo:sentiment
 */

import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';

// =============================================================================
// SAMPLE CUSTOMER FEEDBACK
// =============================================================================
// In production, this would come from:
// - Customer surveys
// - Support tickets
// - Product reviews
// - Social media mentions

const SAMPLE_FEEDBACK = [
  {
    id: 1,
    source: 'Product Review',
    text: "Absolutely love this product! It arrived quickly and works exactly as described. The quality is amazing and it's made my daily routine so much easier. Highly recommend to anyone!",
    customer: 'Happy Customer #1',
  },
  {
    id: 2,
    source: 'Support Ticket',
    text: "I've been waiting for my refund for 3 WEEKS now and nobody is responding to my emails. This is the worst customer service I've ever experienced. I want my money back NOW or I'm disputing the charge.",
    customer: 'Frustrated Customer',
  },
  {
    id: 3,
    source: 'Survey Response',
    text: "The product is okay, nothing special. It does what it's supposed to do but I expected a bit more for the price. Packaging was nice though.",
    customer: 'Neutral Customer',
  },
  {
    id: 4,
    source: 'Social Media',
    text: 'Just got my order from @TechStore - the new headphones are pretty good! Sound quality is great but wish the battery lasted longer. Overall satisfied 👍',
    customer: '@TechFan2024',
  },
  {
    id: 5,
    source: 'Support Ticket',
    text: 'Product stopped working after 2 days. Tried the troubleshooting guide but nothing works. Need help ASAP - I need this for an important presentation tomorrow!',
    customer: 'Urgent Customer',
  },
];

// =============================================================================
// SENTIMENT ANALYZER CLASS
// =============================================================================

/**
 * SentimentAnalyzer - Analyzes customer feedback using AI
 *
 * Provides:
 * - Sentiment detection (positive/negative/neutral)
 * - Emotion identification
 * - Topic extraction
 * - Priority assessment
 * - Response suggestions
 */
class SentimentAnalyzer {
  constructor() {
    this.client = createAIClient('openai');
  }

  /**
   * Analyze a single piece of feedback
   * @param {string} text - The feedback text to analyze
   * @param {string} source - Where the feedback came from (optional)
   * @returns {Promise<Object>} Analysis results
   */
  async analyze(text, source = 'Unknown') {
    const analysisPrompt = `Analyze this customer feedback and provide a detailed assessment.

FEEDBACK SOURCE: ${source}
FEEDBACK TEXT: "${text}"

Analyze and return a JSON object with:
{
  "sentiment": {
    "label": "positive" | "negative" | "neutral" | "mixed",
    "score": 0.0 to 1.0 (0 = very negative, 1 = very positive),
    "confidence": 0.0 to 1.0
  },
  "emotions": ["list of detected emotions like happy, frustrated, confused, grateful, angry"],
  "topics": ["list of main topics mentioned"],
  "urgency": {
    "level": "low" | "medium" | "high" | "critical",
    "reason": "why this urgency level"
  },
  "keyPoints": ["bullet points of main customer concerns or praises"],
  "suggestedAction": "what action should be taken",
  "suggestedResponse": "a brief suggested response to the customer"
}

Be accurate and helpful. Return valid JSON only.`;

    const messages = [
      {
        role: 'system',
        content:
          'You are a customer feedback analyst. Analyze sentiment accurately and provide actionable insights. Always respond with valid JSON.',
      },
      { role: 'user', content: analysisPrompt },
    ];

    const chatOptions = { temperature: 0.2 }; // Low temperature for consistent analysis

    // Use JSON mode if available
    if (this.client.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);
    const analysisText = this.client.getTextContent(response);

    try {
      return JSON.parse(analysisText);
    } catch {
      // Fallback if JSON parsing fails
      return {
        sentiment: { label: 'unknown', score: 0.5, confidence: 0 },
        emotions: [],
        topics: [],
        urgency: { level: 'medium', reason: 'Unable to analyze' },
        keyPoints: ['Analysis failed'],
        suggestedAction: 'Review manually',
        suggestedResponse: '',
        parseError: true,
      };
    }
  }

  /**
   * Analyze multiple pieces of feedback and get summary statistics
   * @param {Array} feedbackItems - Array of { text, source } objects
   * @returns {Promise<Object>} Batch analysis with summary
   */
  async analyzeBatch(feedbackItems) {
    console.log(`\n📊 Analyzing ${feedbackItems.length} feedback items...\n`);

    const results = [];

    for (let i = 0; i < feedbackItems.length; i++) {
      const item = feedbackItems[i];
      console.log(`   Processing ${i + 1}/${feedbackItems.length}...`);

      const analysis = await this.analyze(item.text, item.source);
      results.push({
        ...item,
        analysis,
      });
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(results);

    return {
      results,
      summary,
    };
  }

  /**
   * Calculate summary statistics from analyzed feedback
   */
  calculateSummary(results) {
    const sentiments = results.map((r) => r.analysis.sentiment);
    const urgencies = results.map((r) => r.analysis.urgency);

    // Count sentiments
    const sentimentCounts = {
      positive: sentiments.filter((s) => s.label === 'positive').length,
      negative: sentiments.filter((s) => s.label === 'negative').length,
      neutral: sentiments.filter((s) => s.label === 'neutral').length,
      mixed: sentiments.filter((s) => s.label === 'mixed').length,
    };

    // Calculate average sentiment score
    const avgScore = sentiments.reduce((sum, s) => sum + (s.score || 0.5), 0) / sentiments.length;

    // Count urgencies
    const urgencyCounts = {
      critical: urgencies.filter((u) => u.level === 'critical').length,
      high: urgencies.filter((u) => u.level === 'high').length,
      medium: urgencies.filter((u) => u.level === 'medium').length,
      low: urgencies.filter((u) => u.level === 'low').length,
    };

    // Collect all topics
    const allTopics = results.flatMap((r) => r.analysis.topics || []);
    const topicCounts = {};
    for (const topic of allTopics) {
      const normalizedTopic = topic.toLowerCase();
      topicCounts[normalizedTopic] = (topicCounts[normalizedTopic] || 0) + 1;
    }

    // Sort topics by frequency
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalFeedback: results.length,
      sentimentBreakdown: sentimentCounts,
      averageSentimentScore: avgScore,
      urgencyBreakdown: urgencyCounts,
      topTopics,
      needsImmediateAttention: urgencyCounts.critical + urgencyCounts.high,
    };
  }
}

// =============================================================================
// DEMO
// =============================================================================

async function sentimentAnalysisDemo() {
  console.log('😊 SENTIMENT ANALYSIS FOR CUSTOMER FEEDBACK');
  console.log('='.repeat(60));
  console.log('');

  if (!providerUtils.isProviderAvailable('openai')) {
    console.log('❌ No AI provider available. Please set up your API key.');
    return;
  }

  const analyzer = new SentimentAnalyzer();

  // =========================================================================
  // PART 1: Analyze individual feedback
  // =========================================================================
  console.log('📋 PART 1: INDIVIDUAL FEEDBACK ANALYSIS');
  console.log('-'.repeat(60));

  // Analyze the first three feedback items in detail
  for (let i = 0; i < 3; i++) {
    const feedback = SAMPLE_FEEDBACK[i];
    console.log('');
    console.log(`📝 Feedback #${feedback.id} (${feedback.source})`);
    console.log(`   "${feedback.text.substring(0, 80)}..."`);
    console.log('');

    const analysis = await analyzer.analyze(feedback.text, feedback.source);

    // Display results
    const sentimentEmoji =
      analysis.sentiment.label === 'positive'
        ? '😊'
        : analysis.sentiment.label === 'negative'
          ? '😠'
          : '😐';

    console.log(`   ${sentimentEmoji} Sentiment: ${analysis.sentiment.label.toUpperCase()}`);
    console.log(`      Score: ${(analysis.sentiment.score * 100).toFixed(0)}% positive`);
    console.log(`      Confidence: ${(analysis.sentiment.confidence * 100).toFixed(0)}%`);
    console.log('');
    console.log(`   💭 Emotions: ${analysis.emotions?.join(', ') || 'None detected'}`);
    console.log(`   📌 Topics: ${analysis.topics?.join(', ') || 'None detected'}`);
    console.log('');

    const urgencyEmoji =
      analysis.urgency.level === 'critical'
        ? '🚨'
        : analysis.urgency.level === 'high'
          ? '⚠️'
          : analysis.urgency.level === 'medium'
            ? '📋'
            : '✅';
    console.log(`   ${urgencyEmoji} Urgency: ${analysis.urgency.level.toUpperCase()}`);
    console.log(`      Reason: ${analysis.urgency.reason}`);
    console.log('');
    console.log(`   💡 Suggested Action: ${analysis.suggestedAction}`);
    console.log('');
    console.log(`   📧 Suggested Response:`);
    console.log(`      "${analysis.suggestedResponse}"`);
    console.log('');
    console.log('-'.repeat(60));
  }

  // =========================================================================
  // PART 2: Batch analysis with summary
  // =========================================================================
  console.log('');
  console.log('📊 PART 2: BATCH ANALYSIS WITH SUMMARY');
  console.log('-'.repeat(60));

  const batchResults = await analyzer.analyzeBatch(SAMPLE_FEEDBACK);

  console.log('');
  console.log('📈 SUMMARY STATISTICS:');
  console.log('');

  const { summary } = batchResults;

  // Sentiment breakdown
  console.log('   SENTIMENT BREAKDOWN:');
  console.log(`   😊 Positive: ${summary.sentimentBreakdown.positive}`);
  console.log(`   😐 Neutral:  ${summary.sentimentBreakdown.neutral}`);
  console.log(`   😠 Negative: ${summary.sentimentBreakdown.negative}`);
  console.log(`   🔄 Mixed:    ${summary.sentimentBreakdown.mixed}`);
  console.log('');
  console.log(`   Average Sentiment Score: ${(summary.averageSentimentScore * 100).toFixed(0)}%`);
  console.log('');

  // Urgency breakdown
  console.log('   URGENCY BREAKDOWN:');
  console.log(`   🚨 Critical: ${summary.urgencyBreakdown.critical}`);
  console.log(`   ⚠️  High:     ${summary.urgencyBreakdown.high}`);
  console.log(`   📋 Medium:   ${summary.urgencyBreakdown.medium}`);
  console.log(`   ✅ Low:      ${summary.urgencyBreakdown.low}`);
  console.log('');

  if (summary.needsImmediateAttention > 0) {
    console.log(`   ⚡ ${summary.needsImmediateAttention} items need immediate attention!`);
    console.log('');
  }

  // Top topics
  console.log('   TOP TOPICS MENTIONED:');
  for (const [topic, count] of summary.topTopics) {
    console.log(`   - ${topic}: ${count} mentions`);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('');
  console.log('='.repeat(60));
  console.log('📚 WHAT YOU CAN DO WITH SENTIMENT ANALYSIS:');
  console.log('');
  console.log('1. TRIAGE SUPPORT TICKETS');
  console.log('   - Route urgent/negative feedback to senior agents');
  console.log('   - Auto-tag tickets by topic and urgency');
  console.log('');
  console.log('2. MONITOR BRAND HEALTH');
  console.log('   - Track sentiment over time');
  console.log('   - Identify trending issues');
  console.log('   - Measure impact of changes');
  console.log('');
  console.log('3. IMPROVE PRODUCTS');
  console.log('   - Identify common complaints');
  console.log('   - Understand what customers love');
  console.log('   - Prioritize feature requests');
  console.log('');
  console.log('4. PERSONALIZE RESPONSES');
  console.log('   - Adjust tone based on customer emotion');
  console.log('   - Offer proactive solutions');
  console.log('   - Escalate frustrated customers');
  console.log('');
  console.log('🚀 TRY IT:');
  console.log('   Modify SAMPLE_FEEDBACK with your own customer feedback');
  console.log('   and see how the analysis helps identify issues!');
}

// Export for use in other files
export { SentimentAnalyzer };

// Run the demo
sentimentAnalysisDemo().catch(console.error);
