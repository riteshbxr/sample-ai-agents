import { OpenAIClient } from '../../clients/openai-client.js';
import { ClaudeClient } from '../../clients/claude-client.js';

/**
 * Structured Output Example
 * Demonstrates how to get consistent, parseable JSON responses from AI models
 */
async function structuredOutputExample() {
  console.log('=== Structured Output Example ===\n');

  // Example: Extract structured data from unstructured text
  const unstructuredText = `
    John Smith, a software engineer at TechCorp, sent an email to jane@example.com 
    on 2024-01-15 at 2:30 PM. The subject was "Project Update" and the email 
    contained 3 attachments. The priority was marked as high.
  `;

  console.log('📝 Input Text:');
  console.log(unstructuredText);
  console.log('\n');

  // OpenAI with JSON mode
  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    console.log('🤖 OpenAI - Structured JSON Output:');
    console.log('-'.repeat(60));

    const openaiClient = new OpenAIClient();
    const messages = [
      {
        role: 'system',
        content:
          'You are a data extraction assistant. Extract information and return it as valid JSON.',
      },
      {
        role: 'user',
        content: `Extract the following information from this text and return it as JSON:
        - sender_name
        - sender_role
        - sender_company
        - recipient_email
        - date
        - time
        - subject
        - attachment_count
        - priority

        Text: ${unstructuredText}

        Return only valid JSON, no additional text.`,
      },
    ];

    const response = await openaiClient.chat(messages, {
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const jsonOutput = JSON.parse(response.choices[0].message.content);
    console.log(JSON.stringify(jsonOutput, null, 2));
    console.log('\n');
  }

  // Claude with structured output (using system prompt)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('🤖 Claude - Structured JSON Output:');
    console.log('-'.repeat(60));

    const claudeClient = new ClaudeClient();
    const messages = [
      {
        role: 'user',
        content: `Extract the following information from this text and return it as JSON:
        - sender_name
        - sender_role
        - sender_company
        - recipient_email
        - date
        - time
        - subject
        - attachment_count
        - priority

        Text: ${unstructuredText}

        Return only valid JSON, no additional text.`,
      },
    ];

    const response = await claudeClient.chat(messages, {
      temperature: 0,
    });

    const textContent = claudeClient.getTextContent(response);
    try {
      const jsonOutput = JSON.parse(textContent);
      console.log(JSON.stringify(jsonOutput, null, 2));
    } catch (e) {
      console.log(textContent);
    }
    console.log('\n');
  }

  // Example: Generate structured data
  console.log('📊 Generating Structured Product Data:');
  console.log('-'.repeat(60));

  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAIClient();
    const productPrompt = `Generate a product catalog with 3 products. Each product should have:
    - name (string)
    - price (number)
    - category (string)
    - description (string)
    - in_stock (boolean)
    - tags (array of strings)

    Return as a JSON object with a "products" array.`;

    const response = await openaiClient.chat([{ role: 'user', content: productPrompt }], {
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const catalog = JSON.parse(response.choices[0].message.content);
    console.log(JSON.stringify(catalog, null, 2));
  }
}

structuredOutputExample().catch(console.error);
