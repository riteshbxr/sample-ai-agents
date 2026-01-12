import { getChromaClient } from '../../../utils/chroma-client.js';

/**
 * Persistent Conversation
 * Saves and loads conversation history using ChromaDB
 */
export class PersistentConversation {
  constructor(options = {}) {
    this.client = getChromaClient(options);
    this.collectionName = options.collectionName || 'persistent_conversations';
    this.collection = null;
    this.initialized = false;
  }

  /**
   * Initialize ChromaDB collection
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Try to get existing collection
      this.collection = await this.client.getCollection({
        name: this.collectionName,
      });
    } catch (error) {
      // Collection doesn't exist, create it
      // For conversation storage, we don't need embeddings, but ChromaDB might require them
      this.collection = await this.client.createCollection({
        name: this.collectionName,
      });
    }

    this.initialized = true;
  }

  /**
   * Save a conversation
   * @param {string} id - Conversation ID
   * @param {Array} messages - Array of message objects
   */
  async saveConversation(id, messages) {
    await this.initialize();

    const savedAt = new Date().toISOString();
    const messagesStr = JSON.stringify(messages); // Deep copy via JSON

    // ChromaDB will generate embeddings automatically using the DefaultEmbeddingFunction
    // We don't need to provide embeddings manually
    await this.collection.upsert({
      ids: [id],
      documents: [messagesStr],
      metadatas: [
        {
          savedAt,
          messageCount: messages.length,
        },
      ],
    });
  }

  /**
   * Load a conversation by ID
   * @param {string} id - Conversation ID
   * @returns {Array|null} Array of messages or null if not found
   */
  async loadConversation(id) {
    await this.initialize();

    try {
      const result = await this.collection.get({ ids: [id] });
      if (result.ids && result.ids.length > 0) {
        const messagesStr = result.documents[0];
        return JSON.parse(messagesStr);
      }
    } catch (error) {
      // Conversation not found
    }

    return null;
  }

  /**
   * List all conversations
   * @returns {Array} Array of conversation metadata
   */
  async listConversations() {
    await this.initialize();

    try {
      const result = await this.collection.get();
      if (!result.ids || result.ids.length === 0) {
        return [];
      }

      return result.ids.map((id, index) => {
        const metadata = result.metadatas[index] || {};
        return {
          id,
          messageCount: metadata.messageCount || 0,
          savedAt: metadata.savedAt,
        };
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete a conversation
   * @param {string} id - Conversation ID to delete
   */
  async deleteConversation(id) {
    await this.initialize();
    await this.collection.delete({ ids: [id] });
  }

  /**
   * Clear all conversations
   */
  async clearAll() {
    await this.initialize();
    await this.collection.delete();
  }
}
