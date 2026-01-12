import { ChromaClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import { existsSync, mkdirSync } from 'fs';

/**
 * ChromaDB Client Wrapper
 * Provides a singleton ChromaDB client instance
 */
let chromaClient = null;
let embeddingFunction = null;

/**
 * Get or create ChromaDB client instance
 * @param {Object} options - ChromaDB client options
 * @param {string} [options.path] - Path to ChromaDB (for persistent storage, defaults to absolute path for embedded mode)
 * @returns {ChromaClient} ChromaDB client instance
 */
export function getChromaClient(options = {}) {
  if (!chromaClient) {
    // Initialize embedding function
    if (!embeddingFunction) {
      embeddingFunction = new DefaultEmbeddingFunction();
    }

    // For embedded mode, if path is provided, use it
    // Otherwise, ChromaDB will use in-memory mode
    if (options.path) {
      // Ensure directory exists
      if (!existsSync(options.path)) {
        mkdirSync(options.path, { recursive: true });
      }

      chromaClient = new ChromaClient({
        path: options.path,
        embeddingFunction,
      });
    } else {
      // Use in-memory mode (no path = in-memory)
      chromaClient = new ChromaClient({
        embeddingFunction,
      });
    }
  }
  return chromaClient;
}

/**
 * Reset ChromaDB client (useful for testing)
 */
export function resetChromaClient() {
  chromaClient = null;
  embeddingFunction = null;
}
