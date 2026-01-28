import { RAGAgent } from '../../agents/rag-agent.js';

/**
 * RAG (Retrieval-Augmented Generation) Example
 * Demonstrates how to use vector search with LLM for domain-specific knowledge
 */
async function ragExample() {
  console.log('=== RAG Agent Example ===\n');

  const ragAgent = new RAGAgent('startup_knowledge');

  // Sample documents about a startup (in real use, these would be from your knowledge base)
  const documents = [
    `Our startup, TechFlow, was founded in 2023 and specializes in AI-powered workflow automation. 
    We help businesses automate repetitive tasks using intelligent agents. Our platform supports 
    integration with over 50 popular business tools including Slack, Salesforce, and Google Workspace.`,

    `TechFlow's AI agents use advanced language models to understand natural language instructions 
    and execute complex workflows. Our agents can handle email management, data entry, customer 
    support, and content generation tasks. We've processed over 1 million tasks for our customers.`,

    `Our pricing model includes a free tier for individuals, a Pro plan at $29/month for small teams, 
    and an Enterprise plan with custom pricing. All plans include API access, webhook support, and 
    priority customer support. We offer a 14-day free trial for all paid plans.`,

    `TechFlow is based in San Francisco and has raised $15M in Series A funding led by Sequoia Capital. 
    Our team consists of 25 engineers, 10 product managers, and 5 customer success specialists. 
    We're actively hiring for roles in engineering, sales, and marketing.`,

    `Our platform uses OpenAI's GPT-4 and Anthropic's Claude for different agent capabilities. 
    GPT-4 is used for creative tasks and content generation, while Claude handles complex reasoning 
    and multi-step workflows. We also use vector databases for RAG to provide agents with 
    company-specific knowledge.`,
  ];

  console.log('Adding documents to vector store...');
  await ragAgent.addDocuments(documents);
  console.log('Documents added!\n');

  // Query examples
  const questions = [
    'What does TechFlow do?',
    'What are the pricing plans?',
    'Where is TechFlow located and how much funding have they raised?',
    'What AI models does TechFlow use?',
  ];

  for (const question of questions) {
    console.log(`❓ Question: ${question}`);
    console.log('💡 Answer:');

    const answer = await ragAgent.query(question);
    console.log(answer);
    console.log(`\n${'-'.repeat(60)}\n`);
  }

  // Streaming example
  console.log('📡 Streaming RAG Response:');
  console.log("❓ Question: Tell me about TechFlow's team and funding");
  console.log('💡 Answer (streaming):\n');

  await ragAgent.queryStream("Tell me about TechFlow's team and funding", (chunk) => {
    process.stdout.write(chunk);
  });

  console.log(`\n\n${'='.repeat(60)}`);

  // Get stats
  const stats = await ragAgent.getStats();
  console.log('\n📊 Vector Store Stats:');
  console.log(JSON.stringify(stats, null, 2));
}

// Run the example
ragExample().catch(console.error);
