import { getChromaClient } from '../../../utils/chroma-client.js';

/**
 * Long-term Memory
 * Key-value storage for persistent information using ChromaDB
 */
export class LongTermMemory {
  constructor(options = {}) {
    this.client = getChromaClient(options);
    this.collectionName = options.collectionName || 'long_term_memory';
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
      // For key-value storage, we don't need embeddings, but ChromaDB might require them
      // We'll create a collection without embedding function (using empty embeddings)
      this.collection = await this.client.createCollection({
        name: this.collectionName,
      });
    }

    this.initialized = true;
  }

  /**
   * Store a key-value pair
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON stringified)
   */
  async store(key, value) {
    await this.initialize();

    const timestamp = new Date().toISOString();
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    // Check if key exists to get current accessCount
    let accessCount = 0;
    try {
      const existing = await this.collection.get({ ids: [key] });
      if (existing.ids && existing.ids.length > 0) {
        const metadata = existing.metadatas?.[0];
        accessCount = metadata?.accessCount || 0;
      }
    } catch (error) {
      // Key doesn't exist, that's fine
    }

    // ChromaDB will generate embeddings automatically using the DefaultEmbeddingFunction
    // We don't need to provide embeddings manually
    await this.collection.upsert({
      ids: [key],
      documents: [valueStr],
      metadatas: [
        {
          timestamp,
          accessCount,
          valueType: typeof value,
        },
      ],
    });
  }

  /**
   * Retrieve a value by key
   * @param {string} key - Storage key
   * @returns {*} Retrieved value or null if not found
   */
  async retrieve(key) {
    await this.initialize();

    try {
      const result = await this.collection.get({ ids: [key] });
      if (result.ids && result.ids.length > 0) {
        const document = result.documents[0];
        const metadata = result.metadatas[0];

        // Increment access count
        const newAccessCount = (metadata.accessCount || 0) + 1;
        await this.collection.update({
          ids: [key],
          metadatas: [
            {
              ...metadata,
              accessCount: newAccessCount,
            },
          ],
        });

        // Parse value based on stored type
        if (metadata.valueType === 'object' || metadata.valueType === 'array') {
          return JSON.parse(document);
        }
        return document;
      }
    } catch (error) {
      // Key not found
    }

    return null;
  }

  /**
   * Get all stored entries
   * @returns {Array} Array of entries with key and metadata
   */
  async getAll() {
    await this.initialize();

    try {
      const result = await this.collection.get();
      if (!result.ids || result.ids.length === 0) {
        return [];
      }

      return result.ids.map((id, index) => {
        const document = result.documents[index];
        const metadata = result.metadatas[index] || {};

        let value = document;
        if (metadata.valueType === 'object' || metadata.valueType === 'array') {
          try {
            value = JSON.parse(document);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        return {
          key: id,
          value,
          timestamp: metadata.timestamp,
          accessCount: metadata.accessCount || 0,
        };
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete a key
   * @param {string} key - Key to delete
   */
  async delete(key) {
    await this.initialize();
    await this.collection.delete({ ids: [key] });
  }

  /**
   * Clear all stored data
   */
  async clear() {
    await this.initialize();
    await this.collection.delete();
  }
}
