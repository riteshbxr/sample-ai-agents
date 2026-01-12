import { ChatService } from '../../services/chat-service.js';
import { config } from '../../config.js';

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
  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    console.log('🤖 OpenAI - Structured JSON Output:');
    console.log('-'.repeat(60));

    const chatService = new ChatService('openai');
    const schema = [
      'sender_name',
      'sender_role',
      'sender_company',
      'recipient_email',
      'date',
      'time',
      'subject',
      'attachment_count',
      'priority',
    ];

    try {
      const jsonOutput = await chatService.extractStructuredData(unstructuredText, schema);
      console.log(JSON.stringify(jsonOutput, null, 2));
    } catch (error) {
      console.log('Error:', error.message);
    }
    console.log('\n');
  }

  // Claude with structured output
  if (config.claude.apiKey) {
    console.log('🤖 Claude - Structured JSON Output:');
    console.log('-'.repeat(60));

    const chatService = new ChatService('claude');
    const schema = [
      'sender_name',
      'sender_role',
      'sender_company',
      'recipient_email',
      'date',
      'time',
      'subject',
      'attachment_count',
      'priority',
    ];

    try {
      const jsonOutput = await chatService.extractStructuredData(unstructuredText, schema);
      console.log(JSON.stringify(jsonOutput, null, 2));
    } catch (error) {
      console.log('Error:', error.message);
    }
    console.log('\n');
  }

  // Example: Generate structured data
  console.log('📊 Generating Structured Product Data:');
  console.log('-'.repeat(60));

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    const chatService = new ChatService('openai');
    const productPrompt = `Generate a product catalog with 3 products. Each product should have:
    - name (string)
    - price (number)
    - category (string)
    - description (string)
    - in_stock (boolean)
    - tags (array of strings)

    Return as a JSON object with a "products" array.`;

    try {
      const catalog = await chatService.getStructuredOutput(
        [{ role: 'user', content: productPrompt }],
        {
          temperature: 0.7,
        }
      );
      console.log(JSON.stringify(catalog, null, 2));
    } catch (error) {
      console.log('Error:', error.message);
    }
  }
}

structuredOutputExample().catch(console.error);
