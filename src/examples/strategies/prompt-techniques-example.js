import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';

/**
 * Prompt Engineering Techniques Example
 * Demonstrates various advanced prompting techniques
 */
async function promptTechniquesExample() {
  console.log('=== Prompt Engineering Techniques Example ===\n');

  // Technique 1: Few-Shot Learning
  console.log('1️⃣ Few-Shot Learning:');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');

    const fewShotPrompt = `
Classify the sentiment of these customer reviews:

Review: "This product is amazing! I love it."
Sentiment: positive

Review: "Terrible quality, waste of money."
Sentiment: negative

Review: "It's okay, nothing special."
Sentiment: neutral

Review: "Best purchase I've made this year!"
Sentiment: positive

Now classify this review:
Review: "The product works but could be better."
Sentiment:`;

    const response = await openaiClient.chat([{ role: 'user', content: fewShotPrompt }], {
      temperature: 0,
    });

    console.log('Few-shot classification:');
    console.log(response.choices[0].message.content);
  }

  console.log('\n');

  // Technique 2: Chain-of-Thought (already shown, but with variations)
  console.log('2️⃣ Chain-of-Thought Prompting:');
  console.log('-'.repeat(60));

  if (config.claude.apiKey) {
    const claudeClient = createAIClient('claude');

    const cotPrompt = `Solve this step by step:

Problem: A startup has 100 customers. 60% are on the basic plan ($10/month), 
30% are on pro ($30/month), and 10% are on enterprise ($100/month). 
What's the monthly recurring revenue (MRR)?

Let's think step by step:
1. Calculate customers per plan
2. Calculate revenue per plan
3. Sum total MRR`;

    const response = await claudeClient.chat([{ role: 'user', content: cotPrompt }], {
      temperature: 0.3,
    });

    console.log(claudeClient.getTextContent(response));
  }

  console.log('\n');

  // Technique 3: Role-Playing
  console.log('3️⃣ Role-Playing:');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');

    const rolePrompt = `You are a senior product manager at a tech startup with 10 years of experience.
You're known for data-driven decisions and user-centric thinking.

A junior PM asks: "Should we add a dark mode feature to our app?"

Provide your expert advice:`;

    const response = await openaiClient.chat([{ role: 'user', content: rolePrompt }], {
      temperature: 0.7,
    });

    console.log(response.choices[0].message.content.substring(0, 300));
  }

  console.log('\n');

  // Technique 4: Output Formatting
  console.log('4️⃣ Output Formatting:');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
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

    console.log(response.choices[0].message.content);
  }

  console.log('\n');

  // Technique 5: Constrained Generation
  console.log('5️⃣ Constrained Generation:');
  console.log('-'.repeat(60));

  if (config.claude.apiKey) {
    const claudeClient = createAIClient('claude');

    const constrainedPrompt = `Generate a product tagline that:
- Is exactly 5-7 words
- Mentions AI or automation
- Is catchy and memorable
- Appeals to startups

Generate 3 options, numbered.`;

    const response = await claudeClient.chat([{ role: 'user', content: constrainedPrompt }], {
      temperature: 0.8,
    });

    console.log(claudeClient.getTextContent(response));
  }

  console.log('\n');

  // Technique 6: Self-Consistency
  console.log('6️⃣ Self-Consistency (Multiple Attempts):');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');

    const question = 'What are the top 3 AI trends for startups in 2024?';

    console.log('Generating 3 responses for consistency check...\n');

    const responses = [];
    for (let i = 0; i < 3; i++) {
      const response = await openaiClient.chat([{ role: 'user', content: question }], {
        temperature: 0.7,
      });

      responses.push(response.choices[0].message.content);
      console.log(`Response ${i + 1}: ${response.choices[0].message.content.substring(0, 100)}...`);
    }

    // Check for common themes
    console.log('\n✅ Generated 3 consistent responses');
  }

  console.log('\n');

  // Technique 7: Prompt Chaining
  console.log('7️⃣ Prompt Chaining:');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');

    // Step 1: Generate ideas
    const ideasResponse = await openaiClient.chat([
      { role: 'user', content: 'Generate 5 startup ideas for AI agents' },
    ]);
    const ideas = ideasResponse.choices[0].message.content;

    console.log('Step 1 - Generated Ideas:');
    console.log(ideas.substring(0, 200) + '...\n');

    // Step 2: Evaluate ideas
    const evaluationResponse = await openaiClient.chat([
      {
        role: 'user',
        content: `Evaluate these startup ideas and rank them by market potential:\n\n${ideas}`,
      },
    ]);

    console.log('Step 2 - Evaluation:');
    console.log(evaluationResponse.choices[0].message.content.substring(0, 200) + '...');
  }

  console.log('\n');

  // Technique 8: Negative Prompting
  console.log('8️⃣ Negative Prompting:');
  console.log('-'.repeat(60));

  if (config.claude.apiKey) {
    const claudeClient = createAIClient('claude');

    const negativePrompt = `Write a product description for an AI email tool.

DO NOT:
- Use buzzwords like "revolutionary" or "game-changing"
- Make unrealistic claims
- Use excessive exclamation marks
- Be overly technical

DO:
- Be clear and concise
- Focus on benefits
- Use professional tone
- Be specific about features`;

    const response = await claudeClient.chat([{ role: 'user', content: negativePrompt }], {
      temperature: 0.7,
    });

    console.log(claudeClient.getTextContent(response));
  }

  console.log('\n');

  // Technique 9: Temperature Tuning
  console.log('9️⃣ Temperature Tuning:');
  console.log('-'.repeat(60));

  if (config.openai.apiKey) {
    const openaiClient = createAIClient('azure-openai');
    const prompt = 'Write a creative tagline for an AI startup';

    console.log('Low temperature (0.2) - More deterministic:');
    const lowTemp = await openaiClient.chat([{ role: 'user', content: prompt }], {
      temperature: 0.2,
    });
    console.log(lowTemp.choices[0].message.content.substring(0, 150) + '\n');

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

  if (config.openai.apiKey) {
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

    console.log(response.choices[0].message.content);
  }
}

promptTechniquesExample().catch(console.error);
