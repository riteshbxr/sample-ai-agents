import { SimpleVectorStore } from '../utils/simple-vector-store.js';
import { createAIClient } from '../clients/client-factory.js';

/**
 * RAG (Retrieval-Augmented Generation) Agent
 * Combines vector search with LLM for domain-specific knowledge
 * Uses a simple in-memory vector store (no server required)
 */
export class RAGAgent {
  /**
   * Create a RAG agent
   * @param {string} [collectionName='knowledge_base'] - Collection name for vector store
   * @param {import('../clients/ai-client-interface.js').AIClientInterface} [client] - Optional client instance (for testing)
   */
  constructor(collectionName = 'knowledge_base', client = null) {
    this.openaiClient = client || createAIClient('openai');

    // Use simple in-memory vector store (no server required)
    // For production with persistence, consider using a vector database service
    this.vectorStore = new SimpleVectorStore();

    this.collectionName = collectionName;
    this.initialized = false;
  }

  /**
   * Initialize the vector store
   */
  async initialize() {
    if (this.initialized) return;
    // Simple vector store doesn't need initialization
    this.initialized = true;
  }

  /**
   * Add documents to the vector store
   * @param {Array<string>} documents - Array of document texts
   * @param {Array<Object>} metadatas - Optional metadata for each document
   * @param {Array<string>} ids - Optional IDs for each document
   */
  async addDocuments(documents, metadatas = null, ids = null) {
    await this.initialize();
    const client = this.openaiClient;

    // Generate embeddings
    const embeddings = await client.getEmbeddings(documents);

    // Generate IDs if not provided
    const documentIds = ids || documents.map((_, i) => `doc_${Date.now()}_${i}`);

    // Prepare metadatas
    const documentMetadatas =
      metadatas ||
      documents.map((doc, i) => ({
        text: doc.substring(0, 100), // Store first 100 chars as metadata
        index: i,
      }));

    // Add to vector store
    this.vectorStore.add(documentIds, embeddings, documents, documentMetadatas);

    console.log(`Added ${documents.length} documents to vector store`);
  }

  /**
   * Query with RAG - retrieve relevant context and generate answer
   * @param {string} question - User's question
   * @param {number} topK - Number of relevant documents to retrieve
   * @param {Object} options - Additional options for chat
   * @returns {Promise<string>} Generated answer
   */
  async query(question, topK = 3, options = {}) {
    await this.initialize();
    const client = this.openaiClient;

    // Get embedding for the question
    const [questionEmbedding] = await client.getEmbeddings(question);

    // Query the vector store
    const results = this.vectorStore.query([questionEmbedding], topK);

    // Build context from retrieved documents
    const context = results.documents[0]
      .map((doc, i) => `[Document ${i + 1}]\n${doc}`)
      .join('\n\n');

    // Generate answer with context
    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the provided context. 
If the context doesn't contain enough information to answer the question, say so.
Use the context to provide accurate and detailed answers.`,
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ];

    const response = await client.chat(messages, options);
    return client.getTextContent(response);
  }

  /**
   * Query with streaming - for real-time responses
   * @param {string} question - User's question
   * @param {Function} onChunk - Callback for each chunk
   * @param {number} topK - Number of relevant documents to retrieve
   * @returns {Promise<string>} Full response text
   */
  async queryStream(question, onChunk, topK = 3) {
    await this.initialize();
    const client = this.openaiClient;

    // Get embedding for the question
    const [questionEmbedding] = await client.getEmbeddings(question);

    // Query the vector store
    const results = this.vectorStore.query([questionEmbedding], topK);

    // Build context
    const context = results.documents[0]
      .map((doc, i) => `[Document ${i + 1}]\n${doc}`)
      .join('\n\n');

    // Generate answer with streaming
    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the provided context.`,
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ];

    return await client.chatStream(messages, onChunk);
  }

  /**
   * Delete documents from the vector store
   * @param {Array<string>} ids - IDs of documents to delete
   */
  async deleteDocuments(ids) {
    await this.initialize();
    this.vectorStore.delete(ids);
    console.log(`Deleted ${ids.length} documents from vector store`);
  }

  /**
   * Get collection stats
   * @returns {Promise<Object>} Collection information
   */
  async getStats() {
    await this.initialize();
    const count = this.vectorStore.count();
    return {
      collectionName: this.collectionName,
      documentCount: count,
    };
  }
}
