import { FunctionCallingAgent } from '../../agents/function-calling-agent.js';
import { config } from '../../config.js';

/**
 * Multi-Agent Collaboration Example
 * Demonstrates multiple AI agents working together on a task
 */
class MultiAgentSystem {
  constructor() {
    const provider =
      config.openai.azureApiKey || config.openai.standardApiKey ? 'openai' : 'claude';

    // Research Agent - Gathers information
    this.researchAgent = new FunctionCallingAgent(provider);
    this.setupResearchAgent();

    // Writing Agent - Creates content
    this.writingAgent = new FunctionCallingAgent(provider);
    this.setupWritingAgent();

    // Review Agent - Reviews and improves content
    this.reviewAgent = new FunctionCallingAgent(provider);
    this.setupReviewAgent();
  }

  setupResearchAgent() {
    // Research agent can search for information
    this.researchAgent.registerFunction(
      'searchWeb',
      'Search the web for information on a topic',
      {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
      async ({ query }) => {
        // Mock web search - in production, use real search API
        console.log(`  🔍 [Research Agent] Searching: ${query}`);
        const mockResults = {
          'AI trends 2024': 'AI agents, RAG, and multimodal AI are top trends',
          'startup funding': 'Series A funding averages $10M in 2024',
          'tech stack': 'Modern startups use React, Node.js, and cloud services',
        };
        return { results: mockResults[query] || 'No results found' };
      }
    );
  }

  setupWritingAgent() {
    // Writing agent focuses on content creation
    // No special functions needed, just good prompts
  }

  setupReviewAgent() {
    // Review agent can check content quality
    this.reviewAgent.registerFunction(
      'checkGrammar',
      'Check grammar and spelling in text',
      {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to check' },
        },
        required: ['text'],
      },
      async () => {
        console.log(`  ✏️ [Review Agent] Checking grammar...`);
        // Mock grammar check
        return {
          score: 95,
          issues: [],
          suggestions: ['Consider adding more examples'],
        };
      }
    );
  }

  async collaborateOnTask(task) {
    console.log(`\n🎯 Task: ${task}`);
    console.log('='.repeat(60));

    // Step 1: Research
    console.log('\n📚 Step 1: Research Agent gathering information...');
    const researchPrompt = `Research information about: ${task}. Provide key facts and data points.`;
    const researchResults = await this.researchAgent.chat(researchPrompt);
    console.log(`Research Results: ${researchResults.substring(0, 200)}...`);

    // Step 2: Writing
    console.log('\n✍️ Step 2: Writing Agent creating content...');
    const writingPrompt = `Based on this research: "${researchResults.substring(0, 300)}", 
    create a comprehensive article about: ${task}. Make it engaging and informative.`;
    const article = await this.writingAgent.chat(writingPrompt);
    console.log(`Article: ${article.substring(0, 300)}...`);

    // Step 3: Review
    console.log('\n🔍 Step 3: Review Agent reviewing content...');
    const reviewPrompt = `Review this article for quality, accuracy, and clarity: "${article.substring(0, 500)}". 
    Provide feedback and suggest improvements.`;
    const review = await this.reviewAgent.chat(reviewPrompt);
    console.log(`Review: ${review.substring(0, 300)}...`);

    // Step 4: Final revision
    console.log('\n✨ Step 4: Writing Agent incorporating feedback...');
    const revisionPrompt = `Based on this review: "${review.substring(0, 300)}", 
    revise the article: "${article.substring(0, 500)}". Make the improvements suggested.`;
    const finalArticle = await this.writingAgent.chat(revisionPrompt);

    return {
      research: researchResults,
      draft: article,
      review: review,
      final: finalArticle,
    };
  }
}

async function multiAgentExample() {
  console.log('=== Multi-Agent Collaboration Example ===\n');

  const system = new MultiAgentSystem();

  const tasks = ['AI trends for startups in 2024', 'Best practices for building AI agents'];

  for (const task of tasks) {
    const result = await system.collaborateOnTask(task);
    console.log('\n✅ Collaboration Complete!');
    console.log(`Final article length: ${result.final.length} characters\n`);
    console.log('='.repeat(60) + '\n');
  }
}

multiAgentExample().catch(console.error);
