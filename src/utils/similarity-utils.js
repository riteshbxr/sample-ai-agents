/**
 * Similarity Utilities
 * Common functions for calculating similarity between vectors and texts
 */

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} Cosine similarity score between -1 and 1
 */
export function cosineSimilarity(vecA, vecB) {
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
  if (denominator === 0) {
    return 0; // Avoid division by zero
  }

  return dotProduct / denominator;
}

/**
 * Find the most similar vector from a list
 * @param {Array<number>} queryVector - Query vector
 * @param {Array<Array<number>>} vectors - Array of vectors to search
 * @param {number} topK - Number of top results to return
 * @returns {Array<{index: number, similarity: number}>} Top K similar vectors with indices
 */
export function findMostSimilar(queryVector, vectors, topK = 5) {
  const similarities = vectors.map((vec, idx) => ({
    index: idx,
    similarity: cosineSimilarity(queryVector, vec),
  }));

  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, topK);
}

/**
 * Calculate Jaccard similarity between two sets
 * @param {Set|Array} setA - First set
 * @param {Set|Array} setB - Second set
 * @returns {number} Jaccard similarity score between 0 and 1
 */
export function jaccardSimilarity(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);

  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

/**
 * Calculate Euclidean distance between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} Euclidean distance
 */
export function euclideanDistance(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}
