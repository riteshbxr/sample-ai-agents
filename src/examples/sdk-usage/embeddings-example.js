import { EmbeddingsService } from '../../services/embeddings-service.js';
import { config } from '../../config.js';

/**
 * Standalone Embeddings Example
 * Demonstrates embeddings beyond RAG - similarity search, clustering, classification
 */
async function embeddingsExample() {
  console.log('=== Standalone Embeddings Example ===\n');

  if (!config.openai.azureApiKey && !config.openai.standardApiKey) {
    console.log('⚠️ OpenAI API key required for embeddings example');
    return;
  }

  const embeddingsService = new EmbeddingsService('openai');

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
  const documentEmbeddings = await embeddingsService.getEmbeddings(documents);
  console.log(`✅ Generated ${documentEmbeddings.length} embeddings`);
  console.log(`   Embedding dimension: ${documentEmbeddings[0].length}\n`);

  // Query
  const query = 'What is artificial intelligence?';
  console.log(`Query: "${query}"\n`);

  const similarDocs = await embeddingsService.findSimilarDocuments(query, documents, {
    topK: 3,
  });

  console.log('Most similar documents:');
  similarDocs.forEach((item, idx) => {
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
  const clusterGroups = await embeddingsService.clusterDocuments(techDocs, 3);

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

  // Test classification
  const testTexts = [
    'I need help accessing my account',
    'The login button is broken',
    'Can we have a mobile app version?',
  ];

  console.log('Classifying test texts:\n');

  const classifications = await embeddingsService.classifyText(testTexts, trainingExamples);
  classifications.forEach((result) => {
    console.log(`Text: "${result.text}"`);
    console.log(`Classification: ${result.category} (confidence: ${result.confidence.toFixed(4)})`);
    console.log('');
  });

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

  console.log('Finding similar/duplicate content:\n');

  const duplicates = await embeddingsService.findDuplicates(similarTexts, 0.95);

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
