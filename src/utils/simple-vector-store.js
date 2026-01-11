/**
 * Simple in-memory vector store implementation
 * Uses cosine similarity for vector search
 * No external dependencies or server required
 */

export class SimpleVectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = [];
    this.metadatas = [];
    this.ids = [];
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vecA - First vector
   * @param {Array<number>} vecB - Second vector
   * @returns {number} Cosine similarity score
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Add documents with embeddings to the store
   * @param {Array<string>} ids - Document IDs
   * @param {Array<Array<number>>} embeddings - Embedding vectors
   * @param {Array<string>} documents - Document texts
   * @param {Array<Object>} metadatas - Document metadata
   */
  add(ids, embeddings, documents, metadatas = []) {
    if (ids.length !== embeddings.length || ids.length !== documents.length) {
      throw new Error('ids, embeddings, and documents must have the same length');
    }

    for (let i = 0; i < ids.length; i++) {
      this.ids.push(ids[i]);
      this.embeddings.push(embeddings[i]);
      this.documents.push(documents[i]);
      this.metadatas.push(metadatas[i] || {});
    }
  }

  /**
   * Query the vector store for similar documents
   * @param {Array<Array<number>>} queryEmbeddings - Query embedding vectors
   * @param {number} nResults - Number of results to return
   * @returns {Object} Query results with documents, metadatas, distances, and ids
   */
  query(queryEmbeddings, nResults = 3) {
    if (this.embeddings.length === 0) {
      return {
        ids: [[]],
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      };
    }

    const queryEmbedding = queryEmbeddings[0];
    const similarities = [];

    // Calculate similarity for each stored embedding
    for (let i = 0; i < this.embeddings.length; i++) {
      const similarity = this.cosineSimilarity(queryEmbedding, this.embeddings[i]);
      similarities.push({
        index: i,
        similarity,
        distance: 1 - similarity, // Convert similarity to distance
      });
    }

    // Sort by similarity (descending) and take top nResults
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, nResults);

    // Build result arrays
    const resultIds = [topResults.map((r) => this.ids[r.index])];
    const resultDocuments = [topResults.map((r) => this.documents[r.index])];
    const resultMetadatas = [topResults.map((r) => this.metadatas[r.index])];
    const resultDistances = [topResults.map((r) => r.distance)];

    return {
      ids: resultIds,
      documents: resultDocuments,
      metadatas: resultMetadatas,
      distances: resultDistances,
    };
  }

  /**
   * Delete documents by IDs
   * @param {Array<string>} ids - IDs to delete
   */
  delete(ids) {
    const idsSet = new Set(ids);
    const newIds = [];
    const newEmbeddings = [];
    const newDocuments = [];
    const newMetadatas = [];

    for (let i = 0; i < this.ids.length; i++) {
      if (!idsSet.has(this.ids[i])) {
        newIds.push(this.ids[i]);
        newEmbeddings.push(this.embeddings[i]);
        newDocuments.push(this.documents[i]);
        newMetadatas.push(this.metadatas[i]);
      }
    }

    this.ids = newIds;
    this.embeddings = newEmbeddings;
    this.documents = newDocuments;
    this.metadatas = newMetadatas;
  }

  /**
   * Get the count of documents in the store
   * @returns {number} Number of documents
   */
  count() {
    return this.ids.length;
  }

  /**
   * Clear all documents from the store
   */
  clear() {
    this.ids = [];
    this.embeddings = [];
    this.documents = [];
    this.metadatas = [];
  }
}
