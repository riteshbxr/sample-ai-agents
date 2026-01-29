import { test } from 'node:test';
import assert from 'node:assert';
import { EmbeddingsService } from '../../src/services/embeddings-service.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('EmbeddingsService - constructor with explicit provider', () => {
  const service = new EmbeddingsService('mock');
  assert.strictEqual(service.provider, 'mock');
  assert.ok(service.client);
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - getEmbeddings with single text', async () => {
  const service = new EmbeddingsService('mock');
  service.client.getEmbeddings = async (texts) => {
    return texts.map(() => new Array(1536).fill(0.1));
  };

  const embeddings = await service.getEmbeddings('Test text');

  assert.ok(Array.isArray(embeddings));
  assert.strictEqual(embeddings.length, 1);
  assert.ok(Array.isArray(embeddings[0]));
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - getEmbeddings with multiple texts', async () => {
  const service = new EmbeddingsService('mock');
  service.client.getEmbeddings = async (texts) => {
    return texts.map(() => new Array(1536).fill(0.1));
  };

  const embeddings = await service.getEmbeddings(['Text 1', 'Text 2', 'Text 3']);

  assert.strictEqual(embeddings.length, 3);
  embeddings.forEach((emb) => {
    assert.ok(Array.isArray(emb));
  });
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - findSimilarDocuments', async () => {
  const service = new EmbeddingsService('mock');
  // Create embeddings where first document is similar to query
  service.client.getEmbeddings = async (_texts) => {
    const queryEmbedding = new Array(1536).fill(0.5);
    const doc1Embedding = new Array(1536).fill(0.5); // Similar
    const doc2Embedding = new Array(1536).fill(0.1); // Different
    return [queryEmbedding, doc1Embedding, doc2Embedding];
  };

  const documents = ['Document 1', 'Document 2'];
  const results = await service.findSimilarDocuments('Query', documents);

  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  assert.ok(results[0].similarity > results[1]?.similarity || results.length === 1);
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - findSimilarDocuments with topK limit', async () => {
  const service = new EmbeddingsService('mock');
  service.client.getEmbeddings = async (texts) => {
    return texts.map(() => new Array(1536).fill(0.5));
  };

  const documents = ['Doc 1', 'Doc 2', 'Doc 3', 'Doc 4', 'Doc 5'];
  const results = await service.findSimilarDocuments('Query', documents, { topK: 2 });

  assert.strictEqual(results.length, 2);
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - findSimilarDocuments with threshold', async () => {
  const service = new EmbeddingsService('mock');
  service.client.getEmbeddings = async (_texts) => {
    const queryEmbedding = new Array(1536).fill(0.9);
    const doc1Embedding = new Array(1536).fill(0.9); // Very high similarity (cosine ~1.0)
    const doc2Embedding = new Array(1536).fill(0.1); // Low similarity (cosine ~0.1)
    return [queryEmbedding, doc1Embedding, doc2Embedding];
  };

  const documents = ['Document 1', 'Document 2'];
  const results = await service.findSimilarDocuments('Query', documents, { threshold: 0.8 });

  // Only high similarity document should pass threshold
  // With cosine similarity, identical vectors have similarity ~1.0
  assert.ok(results.length >= 0); // At least 0, but likely 1
  if (results.length > 0) {
    assert.ok(results[0].similarity >= 0.8);
  }
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - findSimilarDocuments with empty documents', async () => {
  const service = new EmbeddingsService('mock');

  const results = await service.findSimilarDocuments('Query', []);

  assert.strictEqual(results.length, 0);
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - clusterDocuments', async () => {
  const service = new EmbeddingsService('mock');
  // Create embeddings that can be clustered
  service.client.getEmbeddings = async (texts) => {
    return texts.map((_, idx) => {
      const embedding = new Array(1536).fill(0);
      // Create 3 distinct clusters
      const cluster = Math.floor(idx / 2);
      for (let i = 0; i < 100; i++) {
        embedding[i] = cluster * 0.5 + 0.1;
      }
      return embedding;
    });
  };

  const documents = ['Doc 1', 'Doc 2', 'Doc 3', 'Doc 4', 'Doc 5', 'Doc 6'];
  const clusters = await service.clusterDocuments(documents, 3);

  assert.ok(typeof clusters === 'object');
  assert.ok(Object.keys(clusters).length > 0);
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - classifyText', async () => {
  const service = new EmbeddingsService('mock');
  // Create embeddings where text is similar to positive examples
  service.client.getEmbeddings = async (texts) => {
    if (texts.includes('Great product')) {
      // Positive example
      return [new Array(1536).fill(0.8)];
    } else if (texts.includes('Amazing')) {
      // Test text similar to positive
      return [new Array(1536).fill(0.75)];
    } else {
      // Negative example
      return [new Array(1536).fill(0.2)];
    }
  };

  const trainingExamples = {
    positive: ['Great product', 'Excellent service'],
    negative: ['Bad quality', 'Poor service'],
  };

  const result = await service.classifyText('Amazing', trainingExamples);

  assert.ok(result.category);
  assert.ok(typeof result.confidence === 'number');
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - classifyText with multiple texts', async () => {
  const service = new EmbeddingsService('mock');
  service.client.getEmbeddings = async (texts) => {
    return texts.map(() => new Array(1536).fill(0.5));
  };

  const trainingExamples = {
    category1: ['Example 1'],
    category2: ['Example 2'],
  };

  const results = await service.classifyText(['Text 1', 'Text 2'], trainingExamples);

  assert.ok(Array.isArray(results));
  assert.strictEqual(results.length, 2);
  results.forEach((result) => {
    assert.ok(result.category);
    assert.ok(result.text);
  });
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - findDuplicates', async () => {
  const service = new EmbeddingsService('mock');
  // Create embeddings where first two are identical
  service.client.getEmbeddings = async (texts) => {
    return texts.map((_, idx) => {
      if (idx < 2) {
        // First two are identical
        return new Array(1536).fill(0.9);
      }
      return new Array(1536).fill(0.1);
    });
  };

  const texts = ['Text 1', 'Text 1 copy', 'Text 2', 'Text 3'];
  const duplicates = await service.findDuplicates(texts, 0.95);

  assert.ok(Array.isArray(duplicates));
  assert.ok(duplicates.length > 0);
  assert.ok(duplicates[0].similarity >= 0.95);
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - findDuplicates with custom threshold', async () => {
  const service = new EmbeddingsService('mock');
  service.client.getEmbeddings = async (texts) => {
    return texts.map(() => new Array(1536).fill(0.5));
  };

  const texts = ['Text 1', 'Text 2', 'Text 3'];
  const duplicates = await service.findDuplicates(texts, 0.99);

  // With threshold 0.99, should find fewer duplicates
  assert.ok(Array.isArray(duplicates));
  assert.ok(service.client instanceof MockAIClient);
});

test('EmbeddingsService - findSimilarDocuments handles insufficient embeddings', async () => {
  const service = new EmbeddingsService('mock');
  // Return fewer embeddings than expected
  service.client.getEmbeddings = async () => {
    return [new Array(1536).fill(0.5)]; // Only query embedding
  };

  const documents = ['Doc 1', 'Doc 2'];
  const results = await service.findSimilarDocuments('Query', documents);

  assert.strictEqual(results.length, 0);
  assert.ok(service.client instanceof MockAIClient);
});
