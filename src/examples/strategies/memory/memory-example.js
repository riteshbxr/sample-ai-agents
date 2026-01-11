import {
  estimateTokens as estimateTokensUtil,
  countMessages as countMessagesUtil,
  optimizeContext,
} from '../../utils/token-utils.js';

/**
 * Memory Management Example
 * Demonstrates advanced conversation handling with context window management
 */
class ConversationManager {
  constructor(client, maxTokens = 8000, summaryThreshold = 0.8) {
    this.client = client;
    this.maxTokens = maxTokens;
    this.summaryThreshold = summaryThreshold;
    this.conversationHistory = [];
    this.summaries = [];
  }

  /**
   * Estimate tokens (using utility function)
   */
  estimateTokens(text) {
    return estimateTokensUtil(text);
  }

  /**
   * Get total tokens in conversation
   */
  getTotalTokens() {
    return countMessagesUtil(this.conversationHistory);
  }

  /**
   * Summarize old conversation history
   */
  async summarizeHistory(messages) {
    const conversationText = messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

    const summaryPrompt = `Summarize this conversation, preserving key information, decisions, and context:

${conversationText}

Provide a concise summary that captures the essential information.`;

    // Use interface method - works for both OpenAI and Claude
    const response = await this.client.chat([{ role: 'user', content: summaryPrompt }], {
      temperature: 0.3,
    });

    return this.client.getTextContent(response);
  }

  /**
   * Manage conversation history - summarize when needed
   */
  async manageHistory() {
    const currentTokens = this.getTotalTokens();
    const threshold = this.maxTokens * this.summaryThreshold;

    if (currentTokens > threshold && this.conversationHistory.length > 4) {
      console.log(`  📝 Conversation getting long (${currentTokens} tokens), summarizing...`);

      // Keep system message and last 2 messages, summarize the rest
      const systemMessage = this.conversationHistory[0];
      const recentMessages = this.conversationHistory.slice(-2);
      const oldMessages = this.conversationHistory.slice(1, -2);

      if (oldMessages.length > 0) {
        const summary = await this.summarizeHistory(oldMessages);
        this.summaries.push({
          timestamp: new Date().toISOString(),
          summary,
          messageCount: oldMessages.length,
        });

        // Replace old messages with summary
        this.conversationHistory = [
          systemMessage,
          {
            role: 'system',
            content: `Previous conversation summary: ${summary}`,
          },
          ...recentMessages,
        ];

        console.log(`  ✅ Summarized ${oldMessages.length} messages into summary`);
      }
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(role, content) {
    this.conversationHistory.push({ role, content });
    await this.manageHistory();
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Get summaries
   */
  getSummaries() {
    return this.summaries;
  }

  /**
   * Reset conversation
   */
  reset() {
    this.conversationHistory = [];
    this.summaries = [];
  }
}

async function memoryExample() {
  console.log('=== Memory Management Example ===\n');

  // Example 1: Basic conversation with memory management
  console.log('1️⃣ Conversation with Automatic Summarization:');
  console.log('-'.repeat(60));

  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAIClient();
    const manager = new ConversationManager(openaiClient, 4000, 0.7);

    await manager.addMessage('system', 'You are a helpful assistant for a startup.');

    const messages = [
      'What are the key features we should include in our MVP?',
      'How should we price our SaaS product?',
      'What marketing channels should we focus on?',
      'Tell me about our previous discussion on MVP features.',
    ];

    for (const message of messages) {
      console.log(`\n👤 User: ${message}`);

      await manager.addMessage('user', message);

      const response = await openaiClient.chat(manager.getHistory());
      const reply = openaiClient.getTextContent(response);

      await manager.addMessage('assistant', reply);

      console.log(`🤖 Assistant: ${reply.substring(0, 150)}...`);
      console.log(`   Tokens: ${manager.getTotalTokens()}`);
    }

    const summaries = manager.getSummaries();
    if (summaries.length > 0) {
      console.log(`\n📚 Generated ${summaries.length} summary(ies)`);
    }
  }

  console.log('\n');

  // Example 2: Context window management
  console.log('2️⃣ Context Window Management:');
  console.log('-'.repeat(60));

  class ContextWindowManager {
    constructor(maxContextLength = 10) {
      this.maxContextLength = maxContextLength;
      this.messages = [];
    }

    addMessage(role, content) {
      this.messages.push({ role, content });

      // Keep only recent messages
      if (this.messages.length > this.maxContextLength) {
        // Keep system message and recent messages
        const systemMsg = this.messages[0];
        const recentMsgs = this.messages.slice(-(this.maxContextLength - 1));
        this.messages = [systemMsg, ...recentMsgs];
      }
    }

    getMessages() {
      return this.messages;
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const claudeClient = new ClaudeClient();
    const contextManager = new ContextWindowManager(6);

    contextManager.addMessage('system', 'You are a coding assistant.');

    const codeQuestions = [
      'How do I create a REST API in Node.js?',
      'What is the best way to handle errors?',
      'How do I implement authentication?',
      'What about rate limiting?',
      'How do I add logging?',
      'What testing framework should I use?',
      'How do I deploy to production?',
    ];

    for (const question of codeQuestions) {
      contextManager.addMessage('user', question);

      const response = await claudeClient.chat(contextManager.getMessages());
      const reply = claudeClient.getTextContent(response);

      contextManager.addMessage('assistant', reply);

      console.log(`Q: ${question}`);
      console.log(`Context length: ${contextManager.getMessages().length} messages\n`);
    }
  }

  console.log('\n');

  // Example 3: Long-term memory with key-value storage
  console.log('3️⃣ Long-term Memory Storage:');
  console.log('-'.repeat(60));

  class LongTermMemory {
    constructor() {
      this.memory = new Map();
    }

    store(key, value) {
      this.memory.set(key, {
        value,
        timestamp: new Date().toISOString(),
        accessCount: 0,
      });
    }

    retrieve(key) {
      const entry = this.memory.get(key);
      if (entry) {
        entry.accessCount++;
        return entry.value;
      }
      return null;
    }

    getAll() {
      return Array.from(this.memory.entries()).map(([key, data]) => ({
        key,
        ...data,
      }));
    }
  }

  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAIClient();
    const memory = new LongTermMemory();

    // Store user preferences
    memory.store('user_name', 'Alex');
    memory.store('company', 'TechStartup Inc.');
    memory.store('preferred_style', 'concise and technical');

    // Use memory in conversation
    const userInfo = memory
      .getAll()
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join(', ');

    const response = await openaiClient.chat([
      {
        role: 'system',
        content: `You are a helpful assistant. User information: ${userInfo}`,
      },
      {
        role: 'user',
        content: 'What should I know about building AI agents?',
      },
    ]);

    console.log('Response with context:');
    console.log(openaiClient.getTextContent(response).substring(0, 200));
    console.log(`\nMemory entries: ${memory.getAll().length}`);
  }

  console.log('\n');

  // Example 4: Conversation export/import
  console.log('4️⃣ Conversation Persistence:');
  console.log('-'.repeat(60));

  class PersistentConversation {
    constructor() {
      this.conversations = new Map();
    }

    saveConversation(id, messages) {
      this.conversations.set(id, {
        messages: JSON.parse(JSON.stringify(messages)), // Deep copy
        savedAt: new Date().toISOString(),
      });
    }

    loadConversation(id) {
      const conv = this.conversations.get(id);
      return conv ? conv.messages : null;
    }

    listConversations() {
      return Array.from(this.conversations.entries()).map(([id, data]) => ({
        id,
        messageCount: data.messages.length,
        savedAt: data.savedAt,
      }));
    }
  }

  const persistentConv = new PersistentConversation();

  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAIClient();
    const messages = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi! How can I help?' },
    ];

    persistentConv.saveConversation('conv_1', messages);
    console.log('✅ Saved conversation');

    const loaded = persistentConv.loadConversation('conv_1');
    console.log(`✅ Loaded conversation with ${loaded.length} messages`);

    const conversations = persistentConv.listConversations();
    console.log(`📚 Total conversations: ${conversations.length}`);
  }
}

memoryExample().catch(console.error);
