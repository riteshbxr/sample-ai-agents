import { createAIClient } from '../clients/client-factory.js';
import { cosineSimilarity } from '../utils/similarity-utils.js';
import { providerUtils } from '../config.js';

/**
 * Embeddings Service
 * Provides reusable embeddings functionality for similarity, clustering, and classification
 */
export class EmbeddingsService {
  constructor(provider = null) {
    this.provider = provider || providerUtils.getDefaultProvider();
    this.client = createAIClient(this.provider);
  }

  /**
   * Get embeddings for texts
   * @param {string|Array<string>} texts - Text(s) to embed
   * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
   * @example
   * const service = new EmbeddingsService();
   * // Single text
   * const embeddings = await service.getEmbeddings('Hello world');
   * // Multiple texts
   * const embeddings = await service.getEmbeddings(['Text 1', 'Text 2', 'Text 3']);
   * console.log(embeddings[0].length); // e.g., 1536 (embedding dimension)
   */
  async getEmbeddings(texts) {
    const textArray = Array.isArray(texts) ? texts : [texts];
    return await this.client.getEmbeddings(textArray);
  }

  /**
   * Find most similar documents to a query
   * @param {string} query - Query text
   * @param {Array<string>} documents - Documents to search
   * @param {Object} options - Options (topK, threshold)
   * @returns {Promise<Array>} Sorted array of {document, similarity, index}
   * @example
   * const service = new EmbeddingsService();
   * const results = await service.findSimilarDocuments(
   *   'What is machine learning?',
   *   ['Document about AI', 'Document about ML', 'Document about cooking'],
   *   { topK: 2, threshold: 0.7 }
   * );
   * console.log(results[0].document); // Most similar document
   * console.log(results[0].similarity); // Similarity score (0-1)
   */
  async findSimilarDocuments(query, documents, options = {}) {
    const { topK = 3, threshold = 0 } = options;

    if (documents.length === 0) {
      return [];
    }

    const allEmbeddings = await this.getEmbeddings([query, ...documents]);

    // Handle case where we might get fewer embeddings than expected
    if (allEmbeddings.length < documents.length + 1) {
      // If we don't have enough embeddings, return empty array or partial results
      return [];
    }

    const queryEmbedding = allEmbeddings[0];
    const documentEmbeddings = allEmbeddings.slice(1);

    // Process all documents that have corresponding embeddings
    const similarities = documents
      .map((doc, idx) => {
        if (idx < documentEmbeddings.length) {
          return {
            document: doc,
            similarity: cosineSimilarity(queryEmbedding, documentEmbeddings[idx]),
            index: idx,
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.filter((item) => item.similarity >= threshold).slice(0, topK);
  }

  /**
   * Cluster documents using K-means
   * @param {Array<string>} documents - Documents to cluster
   * @param {number} k - Number of clusters
   * @param {number} maxIterations - Maximum iterations
   * @returns {Promise<Object>} Clusters grouped by cluster ID
   */
  async clusterDocuments(documents, k = 3, maxIterations = 10) {
    const embeddings = await this.getEmbeddings(documents);
    const clusters = this._kMeansClustering(embeddings, k, maxIterations);

    // Group documents by cluster
    const clusterGroups = {};
    documents.forEach((doc, idx) => {
      const cluster = clusters[idx];
      if (!clusterGroups[cluster]) {
        clusterGroups[cluster] = [];
      }
      clusterGroups[cluster].push(doc);
    });

    return clusterGroups;
  }

  /**
   * K-means clustering implementation
   */
  _kMeansClustering(embeddings, k = 3, maxIterations = 10) {
    const n = embeddings.length;
    const dim = embeddings[0].length;

    // Initialize centroids randomly
    let centroids = [];
    for (let i = 0; i < k; i++) {
      const randomIdx = Math.floor(Math.random() * n);
      centroids.push([...embeddings[randomIdx]]);
    }

    let clusters = new Array(n).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      for (let i = 0; i < n; i++) {
        let maxSimilarity = -Infinity;
        let closestCentroid = 0;

        for (let j = 0; j < k; j++) {
          const similarity = cosineSimilarity(embeddings[i], centroids[j]);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            closestCentroid = j;
          }
        }
        clusters[i] = closestCentroid;
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = embeddings.filter((_, idx) => clusters[idx] === j);
        if (clusterPoints.length > 0) {
          centroids[j] = new Array(dim).fill(0).map((_, d) => {
            return clusterPoints.reduce((sum, point) => sum + point[d], 0) / clusterPoints.length;
          });
        }
      }
    }

    return clusters;
  }

  /**
   * Classify text using few-shot learning with embeddings
   * @param {string|Array<string>} texts - Text(s) to classify
   * @param {Object} trainingExamples - Object with category -> examples mapping
   * @returns {Promise<Object|Array>} Classification results
   */
  async classifyText(texts, trainingExamples) {
    const textArray = Array.isArray(texts) ? texts : [texts];

    // Generate embeddings for training examples
    const trainingEmbeddings = {};
    for (const [category, examples] of Object.entries(trainingExamples)) {
      trainingEmbeddings[category] = await this.getEmbeddings(examples);
    }

    // Classify each text
    const results = [];
    for (const text of textArray) {
      const [textEmbedding] = await this.getEmbeddings([text]);

      let bestCategory = null;
      let bestSimilarity = -1;

      for (const [category, embeddings] of Object.entries(trainingEmbeddings)) {
        // Average similarity to all examples in category
        const avgSimilarity =
          embeddings.reduce((sum, emb) => {
            return sum + cosineSimilarity(textEmbedding, emb);
          }, 0) / embeddings.length;

        if (avgSimilarity > bestSimilarity) {
          bestSimilarity = avgSimilarity;
          bestCategory = category;
        }
      }

      results.push({
        text,
        category: bestCategory,
        confidence: bestSimilarity,
      });
    }

    return Array.isArray(texts) ? results : results[0];
  }

  /**
   * Find duplicate or similar content
   * @param {Array<string>} texts - Texts to check for duplicates
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {Promise<Array>} Array of duplicate pairs
   */
  async findDuplicates(texts, threshold = 0.95) {
    const embeddings = await this.getEmbeddings(texts);
    const duplicates = [];

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        if (similarity >= threshold) {
          duplicates.push({
            text1: texts[i],
            text2: texts[j],
            similarity,
            index1: i,
            index2: j,
          });
        }
      }
    }

    return duplicates;
  }
}
