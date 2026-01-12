import { ContextExtractionService } from '../../../services/context-extraction-service.js';
import { config } from '../../../config.js';

/**
 * Context Extraction from Chat History Example
 * Demonstrates the pattern used in galactiq for extracting relevant context
 *
 * In galactiq, the generateTemplateTool extracts relevant messages from chat history
 * to provide context for template generation. This pattern:
 * - Filters conversation history for relevant messages
 * - Extracts context related to specific goals
 * - Manages conversation context efficiently
 * - Removes AI messages with tool calls to avoid noise
 */

/**
 * Extract relevant context from chat history
 * Simulates the pattern in galactiq's generateTemplateTool
 */
async function extractRelevantContext(chatHistory, goal, options = {}, extractor) {
  const {
    maxContextLength = 1000,
    includeSystemMessages = false,
    filterToolCalls = true,
  } = options;

  console.log(`\n🔍 [Context Extraction] Extracting context for goal: "${goal}"`);
  console.log(`   Chat history length: ${chatHistory.length} messages\n`);

  // Step 1: Filter messages (remove AI messages with tool calls if needed)
  let filteredMessages = extractor.filterMessages(chatHistory, {
    includeSystemMessages,
    filterToolCalls,
  });

  console.log(`  📊 [Filter] After filtering: ${filteredMessages.length} messages`);

  // Step 2: Extract relevant messages using LLM
  const relevantMessages = await identifyRelevantMessages(
    filteredMessages,
    goal,
    maxContextLength,
    extractor
  );

  console.log(`  ✅ [Extract] Extracted ${relevantMessages.length} relevant messages`);

  // Step 3: Combine into context string
  const context = combineMessages(relevantMessages, extractor);

  return {
    context,
    messageCount: relevantMessages.length,
    totalLength: context.length,
  };
}

/**
 * Filter messages based on criteria
 * Simulates removeAIMessagesWithToolCalls from galactiq
 */
function filterMessages(messages, options = {}) {
  const { includeSystemMessages = false, filterToolCalls = true } = options;

  return messages.filter((message) => {
    // Filter system messages if not included
    if (!includeSystemMessages && message.role === 'system') {
      return false;
    }

    // Filter tool messages
    if (message.role === 'tool') {
      return false;
    }

    // Filter AI messages with tool calls (if enabled)
    if (filterToolCalls && message.role === 'assistant') {
      // Check if message has tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        return false;
      }
      if (message.content && Array.isArray(message.content)) {
        const hasToolUse = message.content.some((c) => c.type === 'tool_use');
        if (hasToolUse) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Identify relevant messages using LLM
 * Simulates the LLM-based extraction in galactiq
 */
async function identifyRelevantMessages(messages, goal, maxLength, extractor) {
  if (messages.length === 0) {
    return [];
  }

  // Build prompt for context extraction
  const systemPrompt = `You are an AI assistant that extracts relevant messages from chat history.
Your task is to identify which messages from the conversation history are relevant to the given goal.

Instructions:
1. Review all messages in the chat history
2. Identify messages that contain information relevant to the goal
3. Return the indices of relevant messages (0-based)
4. Only include messages that directly relate to the goal
5. Preserve the original wording of messages - do not summarize or omit content

Return your response as a JSON array of message indices.`;

  const userPrompt = `Goal: ${goal}

Chat History:
${messages.map((msg, i) => `[${i}] ${msg.role}: ${extractor.getMessageContent(msg)}`).join('\n')}

Return a JSON array of message indices that are relevant to the goal. Example: [0, 2, 5]`;

  try {
    const response = await extractor.client.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }
    );

    const content = response.choices?.[0]?.message?.content || response.content?.[0]?.text || '{}';
    const result = JSON.parse(content);

    // Extract indices (handle different response formats)
    const indices = result.indices || result.relevant_indices || result.messages || [];

    // Get relevant messages
    const relevantMessages = indices
      .filter((idx) => idx >= 0 && idx < messages.length)
      .map((idx) => messages[idx]);

    // Limit by max length
    let combined = combineMessages(relevantMessages, extractor);
    if (combined.length > maxLength) {
      // Truncate from the end, keeping most recent messages
      const truncated = [];
      let currentLength = 0;
      for (let i = relevantMessages.length - 1; i >= 0; i--) {
        const msgContent = extractor.getMessageContent(relevantMessages[i]);
        if (currentLength + msgContent.length <= maxLength) {
          truncated.unshift(relevantMessages[i]);
          currentLength += msgContent.length;
        } else {
          break;
        }
      }
      return truncated;
    }

    return relevantMessages;
  } catch (error) {
    console.log(
      `  ⚠️  [Extract] Error in LLM extraction, using all filtered messages: ${error.message}`
    );
    // Fallback: return all filtered messages
    return messages;
  }
}

// getMessageContent is available through extractor.getMessageContent()

/**
 * Combine messages into context string
 */
function combineMessages(messages, extractor) {
  return messages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      const content = extractor.getMessageContent(msg);
      return `${role}: ${content}`;
    })
    .join('\n\n');
}

/**
 * Extract context for template generation
 * Simulates the exact pattern from galactiq's generateTemplateTool
 */
async function extractTemplateContext(chatHistory, templateDescription, extractor) {
  const userMessage = `Based on the chat history, extract all messages relevant for the content the following Template goal/description:
\`\`\`txt
${templateDescription}
\`\`\`

Append all the relevant chat messages together into a single response, in their original wording, without summarizing or omitting any content.
If there are no relevant chat messages, return "" (empty string).`;

  // Filter messages (remove AI messages with tool calls)
  const filteredMessages = extractor.filterMessages(chatHistory, {
    filterToolCalls: true,
    includeSystemMessages: false,
  });

  // Add the extraction request as a user message
  const messages = [...filteredMessages, { role: 'user', content: userMessage }];

  // Get extraction from LLM
  const response = await extractor.client.chat(messages);
  const extractedContext =
    response.choices?.[0]?.message?.content || response.content?.[0]?.text || '';

  return extractedContext === '""' ? '' : extractedContext;
}

/**
 * Main example function
 */
async function contextExtractionExample() {
  console.log('=== Context Extraction from Chat History Example ===');
  console.log('Context extraction pattern from galactiq\n');

  const provider = config.openai.azureApiKey || config.openai.standardApiKey ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  const extractor = new ContextExtractionService(provider);

  try {
    // Example chat history (simulating a conversation)
    const chatHistory = [
      { role: 'user', content: 'I want to create an email campaign' },
      {
        role: 'assistant',
        content: 'I can help you create an email campaign. What would you like to promote?',
      },
      { role: 'user', content: 'We\'re launching a new product called "AI Assistant Pro"' },
      { role: 'assistant', content: 'Great! Tell me more about AI Assistant Pro.' },
      { role: 'user', content: 'It helps teams collaborate better with AI-powered features' },
      { role: 'assistant', content: "Perfect. What's your target audience?" },
      { role: 'user', content: 'Small to medium businesses, especially tech companies' },
      { role: 'assistant', content: 'Got it. Now, what tone should the email have?' },
      {
        role: 'user',
        content: 'Professional but friendly, and highlight the productivity benefits',
      },
      // Simulate an AI message with tool call (should be filtered)
      {
        role: 'assistant',
        content: "I'll create the template now.",
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'generate_template', arguments: '{}' },
          },
        ],
      },
      { role: 'tool', content: 'Template generated', tool_call_id: 'call_1' },
      { role: 'user', content: 'Actually, can you make it more casual?' },
      { role: 'assistant', content: 'Sure, I can adjust the tone to be more casual.' },
    ];

    // Example 1: Extract context for template generation
    console.log('📝 Example 1: Extract Context for Template Generation');
    console.log('='.repeat(60));

    const templateDescription = 'Product launch email for AI Assistant Pro';
    const context1 = await extractTemplateContext(chatHistory, templateDescription, extractor);

    console.log(`\n📤 Extracted Context:`);
    console.log(`   Length: ${context1.length} characters`);
    console.log(
      `   Content:\n${context1.substring(0, 500)}${context1.length > 500 ? '...' : ''}\n`
    );

    // Example 2: Extract relevant context with filtering
    console.log('\n\n📝 Example 2: Extract Relevant Context with Filtering');
    console.log('='.repeat(60));

    const result2 = await extractRelevantContext(
      chatHistory,
      'Product details and target audience for AI Assistant Pro',
      { maxContextLength: 800 },
      extractor
    );

    console.log(`\n📤 Extraction Result:`);
    console.log(`   Messages extracted: ${result2.messageCount}`);
    console.log(`   Total length: ${result2.totalLength} characters`);
    console.log(
      `   Context:\n${result2.context.substring(0, 400)}${result2.context.length > 400 ? '...' : ''}\n`
    );

    // Example 3: Filter messages demonstration
    console.log('\n\n📝 Example 3: Message Filtering Demonstration');
    console.log('='.repeat(60));

    const allMessages = chatHistory.length;
    const filtered = filterMessages(chatHistory, {
      filterToolCalls: true,
      includeSystemMessages: false,
    });

    console.log(`\n📊 Filtering Results:`);
    console.log(`   Total messages: ${allMessages}`);
    console.log(`   After filtering: ${filtered.length}`);
    console.log(
      `   Removed: ${allMessages - filtered.length} messages (tool calls and tool responses)`
    );
    console.log(`\n   Filtered messages:`);
    filtered.forEach((msg, i) => {
      console.log(`     ${i + 1}. [${msg.role}] ${msg.content.substring(0, 60)}...`);
    });

    // Example 4: Context for different goals
    console.log('\n\n📝 Example 4: Context Extraction for Different Goals');
    console.log('='.repeat(60));

    const goals = [
      'Product features and benefits',
      'Target audience information',
      'Email tone and style preferences',
    ];

    for (const goal of goals) {
      console.log(`\n   Goal: "${goal}"`);
      const result = await extractRelevantContext(
        chatHistory,
        goal,
        {
          maxContextLength: 500,
        },
        extractor
      );
      console.log(`   Extracted ${result.messageCount} relevant messages`);
      console.log(`   Context length: ${result.totalLength} characters`);
    }

    console.log('\n✅ All context extraction examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Message filtering: Remove tool calls and irrelevant messages');
    console.log('  - Relevance extraction: Use LLM to identify relevant messages');
    console.log('  - Context combination: Combine messages into usable context');
    console.log('  - Length management: Control context size for efficiency');
    console.log("  - Pattern matches galactiq's context extraction in generateTemplateTool");
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
contextExtractionExample().catch(console.error);
