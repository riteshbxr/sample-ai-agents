import { PromptService } from '../../services/prompt-service.js';
import { ChatService } from '../../services/chat-service.js';
import { createAIClient } from '../../clients/client-factory.js';
import { providerUtils } from '../../config.js';

/**
 * Prompt Engineering Techniques Example
 * Demonstrates various advanced prompting techniques
 */
async function promptTechniquesExample() {
  console.log('=== Prompt Engineering Techniques Example ===\n');

  // Technique 1: Few-Shot Learning
  console.log('1️⃣ Few-Shot Learning:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const promptService = new PromptService('openai');

    const examples = [
      { input: 'This product is amazing! I love it.', output: 'positive' },
      { input: 'Terrible quality, waste of money.', output: 'negative' },
      { input: "It's okay, nothing special.", output: 'neutral' },
      { input: "Best purchase I've made this year!", output: 'positive' },
    ];

    const result = await promptService.fewShotLearning(
      examples,
      'The product works but could be better.',
      {
        taskDescription: 'Classify the sentiment of these customer reviews:',
        temperature: 0,
      }
    );

    console.log('Few-shot classification:');
    console.log(result);
  }

  console.log('\n');

  // Technique 2: Chain-of-Thought (already shown, but with variations)
  console.log('2️⃣ Chain-of-Thought Prompting:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('claude')) {
    const promptService = new PromptService('claude');

    const problem = `A startup has 100 customers. 60% are on the basic plan ($10/month), 
30% are on pro ($30/month), and 10% are on enterprise ($100/month). 
What's the monthly recurring revenue (MRR)?`;

    const steps = ['Calculate customers per plan', 'Calculate revenue per plan', 'Sum total MRR'];

    const result = await promptService.chainOfThought(problem, steps, {
      temperature: 0.3,
    });

    console.log(result);
  }

  console.log('\n');

  // Technique 3: Role-Playing
  console.log('3️⃣ Role-Playing:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const promptService = new PromptService('openai');

    const role = `a senior product manager at a tech startup with 10 years of experience.
You're known for data-driven decisions and user-centric thinking.`;

    const question = `A junior PM asks: "Should we add a dark mode feature to our app?"

Provide your expert advice:`;

    const result = await promptService.rolePlaying(role, question, {
      temperature: 0.7,
    });

    console.log(result.substring(0, 300));
  }

  console.log('\n');

  // Technique 4: Output Formatting
  console.log('4️⃣ Output Formatting:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const openaiClient = createAIClient('azure-openai');

    const formatPrompt = `Create a product roadmap for an AI agent platform. 
Format the output as:
- Feature Name
  - Description: [description]
  - Priority: [High/Medium/Low]
  - Timeline: [Q1/Q2/Q3/Q4 2024]

List 5 features.`;

    const response = await openaiClient.chat([{ role: 'user', content: formatPrompt }], {
      temperature: 0.7,
    });

    console.log(openaiClient.getTextContent(response));
  }

  console.log('\n');

  // Technique 5: Constrained Generation
  console.log('5️⃣ Constrained Generation:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('claude')) {
    const promptService = new PromptService('claude');
    const chatService = new ChatService('claude');

    const task = 'Generate a product tagline. Generate 3 options, numbered.';
    const constraints = {
      do: [
        'Is exactly 5-7 words',
        'Mentions AI or automation',
        'Is catchy and memorable',
        'Appeals to startups',
      ],
    };

    const prompt = promptService.createConstrainedPrompt(task, constraints);
    const response = await chatService.chat([{ role: 'user', content: prompt }], {
      temperature: 0.8,
    });

    console.log(response.content);
  }

  console.log('\n');

  // Technique 6: Self-Consistency
  console.log('6️⃣ Self-Consistency (Multiple Attempts):');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const promptService = new PromptService('openai');

    const question = 'What are the top 3 AI trends for startups in 2024?';

    console.log('Generating 3 responses for consistency check...\n');

    const responses = await promptService.selfConsistency(question, 3, {
      temperature: 0.7,
    });

    responses.forEach((response, i) => {
      console.log(`Response ${i + 1}: ${response.substring(0, 100)}...`);
    });

    // Check for common themes
    console.log('\n✅ Generated 3 consistent responses');
  }

  console.log('\n');

  // Technique 7: Prompt Chaining
  console.log('7️⃣ Prompt Chaining:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const promptService = new PromptService('openai');

    const chain = [
      {
        prompt: 'Generate 5 startup ideas for AI agents',
        options: {},
      },
      {
        prompt: 'Evaluate these startup ideas and rank them by market potential:',
        options: {},
      },
    ];

    const results = await promptService.promptChain(chain);

    console.log('Step 1 - Generated Ideas:');
    console.log(`${results[0].substring(0, 200)}...\n`);

    console.log('Step 2 - Evaluation:');
    console.log(`${results[1].substring(0, 200)}...`);
  }

  console.log('\n');

  // Technique 8: Negative Prompting
  console.log('8️⃣ Negative Prompting:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('claude')) {
    const promptService = new PromptService('claude');
    const chatService = new ChatService('claude');

    const task = 'Write a product description for an AI email tool.';
    const constraints = {
      doNot: [
        'Use buzzwords like "revolutionary" or "game-changing"',
        'Make unrealistic claims',
        'Use excessive exclamation marks',
        'Be overly technical',
      ],
      do: [
        'Be clear and concise',
        'Focus on benefits',
        'Use professional tone',
        'Be specific about features',
      ],
    };

    const prompt = promptService.createConstrainedPrompt(task, constraints);
    const response = await chatService.chat([{ role: 'user', content: prompt }], {
      temperature: 0.7,
    });

    console.log(response.content);
  }

  console.log('\n');

  // Technique 9: Temperature Tuning
  console.log('9️⃣ Temperature Tuning:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const openaiClient = createAIClient('azure-openai');
    const prompt = 'Write a creative tagline for an AI startup';

    console.log('Low temperature (0.2) - More deterministic:');
    const lowTemp = await openaiClient.chat([{ role: 'user', content: prompt }], {
      temperature: 0.2,
    });
    console.log(`${lowTemp.choices[0].message.content.substring(0, 150)}\n`);

    console.log('High temperature (1.0) - More creative:');
    const highTemp = await openaiClient.chat([{ role: 'user', content: prompt }], {
      temperature: 1.0,
    });
    console.log(highTemp.choices[0].message.content.substring(0, 150));
  }

  console.log('\n');

  // Technique 10: Meta-Prompting
  console.log('🔟 Meta-Prompting:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    const openaiClient = createAIClient('azure-openai');

    const metaPrompt = `You are an expert at writing prompts for AI systems.

A user wants to create a prompt that will help an AI write effective email subject lines for a SaaS product.

Create the best possible prompt for this task. The prompt should:
- Be clear and specific
- Include examples
- Define the desired output format
- Set appropriate constraints

Write the prompt:`;

    const response = await openaiClient.chat([{ role: 'user', content: metaPrompt }], {
      temperature: 0.7,
    });

    console.log(openaiClient.getTextContent(response));
  }
}

promptTechniquesExample().catch(console.error);
