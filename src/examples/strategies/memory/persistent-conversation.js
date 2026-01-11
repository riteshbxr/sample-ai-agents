/**
 * Persistent Conversation
 * Saves and loads conversation history
 */
export class PersistentConversation {
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
