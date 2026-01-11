import { createAIClient } from '../../clients/client-factory.js';
import { cosineSimilarity } from '../../utils/similarity-utils.js';

/**
 * Standalone Embeddings Example
 * Demonstrates embeddings beyond RAG - similarity search, clustering, classification
 */
async function embeddingsExample() {
  console.log('=== Standalone Embeddings Example ===\n');

  if (!process.env.AZURE_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log('⚠️ OpenAI API key required for embeddings example');
    return;
  }

  const openaiClient = createAIClient('openai');

  // Example 1: Semantic Similarity Search
  console.log('1️⃣ Semantic Similarity Search:');
  console.log('-'.repeat(60));

  const documents = [
    'The quick brown fox jumps over the lazy dog',
    'A fast animal leaps above a sleeping canine',
    'Python is a popular programming language',
    'JavaScript is used for web development',
    'Machine learning models can predict outcomes',
    'AI systems learn from data patterns',
  ];

  console.log('Generating embeddings for documents...\n');
  const documentEmbeddings = await openaiClient.getEmbeddings(documents);
  console.log(`✅ Generated ${documentEmbeddings.length} embeddings`);
  console.log(`   Embedding dimension: ${documentEmbeddings[0].length}\n`);

  // Query
  const query = 'What is artificial intelligence?';
  console.log(`Query: "${query}"\n`);

  const [queryEmbedding] = await openaiClient.getEmbeddings([query]);

  // Using cosineSimilarity from utils

  // Find most similar documents
  const similarities = documents.map((doc, idx) => ({
    document: doc,
    similarity: cosineSimilarity(queryEmbedding, documentEmbeddings[idx]),
    index: idx,
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  console.log('Most similar documents:');
  similarities.slice(0, 3).forEach((item, idx) => {
    console.log(`\n${idx + 1}. Similarity: ${item.similarity.toFixed(4)}`);
    console.log(`   "${item.document}"`);
  });

  console.log('\n');

  // Example 2: Document Clustering
  console.log('2️⃣ Document Clustering:');
  console.log('-'.repeat(60));

  const techDocs = [
    'Python programming language tutorial',
    'JavaScript web development guide',
    'Machine learning algorithms explained',
    'Deep learning neural networks',
    'React frontend framework',
    'Node.js backend development',
    'Data science with Python',
    'Natural language processing',
  ];

  console.log('Clustering documents by topic...\n');
  const techEmbeddings = await openaiClient.getEmbeddings(techDocs);

  // Simple K-means clustering (K=3)
  function kMeansClustering(embeddings, k = 3, maxIterations = 10) {
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
        let minDist = Infinity;
        let closestCentroid = 0;

        for (let j = 0; j < k; j++) {
          const dist = cosineSimilarity(embeddings[i], centroids[j]);
          if (dist > minDist) {
            minDist = dist;
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

  const clusters = kMeansClustering(techEmbeddings, 3);

  // Group documents by cluster
  const clusterGroups = {};
  techDocs.forEach((doc, idx) => {
    const cluster = clusters[idx];
    if (!clusterGroups[cluster]) {
      clusterGroups[cluster] = [];
    }
    clusterGroups[cluster].push(doc);
  });

  console.log('Clusters found:');
  Object.entries(clusterGroups).forEach(([clusterId, docs]) => {
    console.log(`\nCluster ${clusterId}:`);
    docs.forEach((doc) => console.log(`  - ${doc}`));
  });

  console.log('\n');

  // Example 3: Text Classification
  console.log('3️⃣ Text Classification:');
  console.log('-'.repeat(60));

  // Training examples (few-shot classification)
  const trainingExamples = {
    support: [
      'How do I reset my password?',
      'I cannot log into my account',
      'Help with billing issues',
    ],
    feature_request: [
      'Can you add dark mode?',
      'I would like to see export functionality',
      'Please add integration with Slack',
    ],
    bug_report: [
      'The app crashes when I click save',
      'Error 500 when uploading files',
      'Button does not respond to clicks',
    ],
  };

  console.log('Generating embeddings for training examples...\n');

  const trainingEmbeddings = {};
  for (const [category, examples] of Object.entries(trainingExamples)) {
    trainingEmbeddings[category] = await openaiClient.getEmbeddings(examples);
  }

  // Test classification
  const testTexts = [
    'I need help accessing my account',
    'The login button is broken',
    'Can we have a mobile app version?',
  ];

  console.log('Classifying test texts:\n');

  for (const testText of testTexts) {
    const [testEmbedding] = await openaiClient.getEmbeddings([testText]);

    let bestCategory = null;
    let bestSimilarity = -1;

    for (const [category, embeddings] of Object.entries(trainingEmbeddings)) {
      // Average similarity to all examples in category
      const avgSimilarity =
        embeddings.reduce((sum, emb) => {
          return sum + cosineSimilarity(testEmbedding, emb);
        }, 0) / embeddings.length;

      if (avgSimilarity > bestSimilarity) {
        bestSimilarity = avgSimilarity;
        bestCategory = category;
      }
    }

    console.log(`Text: "${testText}"`);
    console.log(`Classification: ${bestCategory} (confidence: ${bestSimilarity.toFixed(4)})`);
    console.log('');
  }

  console.log('\n');

  // Example 4: Finding Duplicate Content
  console.log('4️⃣ Duplicate Content Detection:');
  console.log('-'.repeat(60));

  const similarTexts = [
    'The quick brown fox jumps over the lazy dog',
    'A quick brown fox jumps over a lazy dog',
    'The fast brown fox leaps over the sleeping dog',
    'Python is a programming language',
    'JavaScript is a scripting language',
  ];

  const similarEmbeddings = await openaiClient.getEmbeddings(similarTexts);

  console.log('Finding similar/duplicate content:\n');

  const threshold = 0.95; // Similarity threshold for duplicates
  const duplicates = [];

  for (let i = 0; i < similarTexts.length; i++) {
    for (let j = i + 1; j < similarTexts.length; j++) {
      const similarity = cosineSimilarity(similarEmbeddings[i], similarEmbeddings[j]);
      if (similarity >= threshold) {
        duplicates.push({
          text1: similarTexts[i],
          text2: similarTexts[j],
          similarity,
        });
      }
    }
  }

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} potential duplicate(s):\n`);
    duplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. Similarity: ${dup.similarity.toFixed(4)}`);
      console.log(`   "${dup.text1}"`);
      console.log(`   "${dup.text2}"\n`);
    });
  } else {
    console.log('No duplicates found above threshold');
  }

  console.log('\n💡 Embeddings Use Cases:');
  console.log('-'.repeat(60));
  console.log('1. Semantic search (beyond keyword matching)');
  console.log('2. Document clustering and organization');
  console.log('3. Text classification and categorization');
  console.log('4. Duplicate detection and deduplication');
  console.log('5. Recommendation systems');
  console.log('6. Anomaly detection');
  console.log('7. Content moderation');
  console.log('8. Question-answering systems (RAG)');
}

embeddingsExample().catch(console.error);
