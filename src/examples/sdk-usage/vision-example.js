import { OpenAIClient } from '../../clients/openai-client.js';
import { ClaudeClient } from '../../clients/claude-client.js';
import fs from 'fs';

/**
 * Vision/Image Analysis Example
 * Demonstrates image analysis capabilities with GPT-4 Vision and Claude 3.5
 */
async function visionExample() {
  console.log('=== Vision/Image Analysis Example ===\n');

  // Helper function to encode image to base64
  function encodeImage(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.warn(`Could not read image: ${imagePath}`);
      return null;
    }
  }

  // Example 1: Image description with OpenAI
  console.log('1️⃣ Image Description (OpenAI GPT-4 Vision):');
  console.log('-'.repeat(60));

  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAIClient();

    // Note: For vision, you need to provide an image URL or base64
    // This is a mock example - replace with actual image path
    const imagePath = './example-image.png'; // Replace with your image

    // Check if image exists, otherwise use a placeholder
    let imageBase64 = null;
    let imageUrl = null;

    if (fs.existsSync(imagePath)) {
      imageBase64 = encodeImage(imagePath);
    } else {
      // Use a sample image URL for demonstration
      imageUrl =
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg';
    }

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this image in detail. What do you see?',
          },
          ...(imageBase64
            ? [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                  },
                },
              ]
            : imageUrl
              ? [
                  {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  },
                ]
              : []),
        ],
      },
    ];

    try {
      // Note: Vision models may have different model names
      // For Azure: Use your vision deployment name
      // For OpenAI: Use 'gpt-4-vision-preview' or 'gpt-4o'
      const response = await openaiClient.client.chat.completions.create({
        model: 'gpt-4o', // or 'gpt-4-vision-preview' or your Azure vision deployment
        messages,
        max_tokens: 300,
      });

      console.log('Image Description:');
      console.log(response.choices[0].message.content);
    } catch (error) {
      console.log('⚠️ Vision API not available or image not found');
      console.log('   Error:', error.message);
      console.log('   Note: Make sure you have a vision-capable model deployed');
    }
  }

  console.log('\n');

  // Example 2: Image analysis with Claude
  console.log('2️⃣ Image Analysis (Claude 3.5):');
  console.log('-'.repeat(60));

  if (process.env.ANTHROPIC_API_KEY) {
    const claudeClient = new ClaudeClient();

    // Claude supports images via base64 or URLs
    const imageUrl =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg';

    try {
      const response = await claudeClient.client.messages.create({
        model: claudeClient.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl,
                },
              },
              {
                type: 'text',
                text: 'Analyze this image. What are the main elements? What mood or atmosphere does it convey?',
              },
            ],
          },
        ],
      });

      const textContent = claudeClient.getTextContent(response);
      console.log('Image Analysis:');
      console.log(textContent);
    } catch (error) {
      console.log('⚠️ Vision API error:', error.message);
    }
  }

  console.log('\n');

  // Example 3: Document/image OCR
  console.log('3️⃣ Document OCR (Text Extraction):');
  console.log('-'.repeat(60));

  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    // Example: Extract text from an image
    // OCR prompt would be used here with an actual image file
    console.log('OCR Prompt prepared. (Requires actual image file)');
    console.log('To use: Provide an image path with text content');
  }

  console.log('\n');

  // Example 4: Visual question answering
  console.log('4️⃣ Visual Question Answering:');
  console.log('-'.repeat(60));

  if (process.env.ANTHROPIC_API_KEY) {
    const claudeClient = new ClaudeClient();

    const imageUrl =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg';
    const questions = [
      'What type of environment is shown in this image?',
      'What colors dominate the image?',
      'What time of day does this appear to be?',
    ];

    for (const question of questions) {
      try {
        const response = await claudeClient.client.messages.create({
          model: claudeClient.model,
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'url',
                    url: imageUrl,
                  },
                },
                {
                  type: 'text',
                  text: question,
                },
              ],
            },
          ],
        });

        const answer = claudeClient.getTextContent(response);
        console.log(`Q: ${question}`);
        console.log(`A: ${answer}\n`);
      } catch (error) {
        console.log(`Error answering: ${error.message}\n`);
      }
    }
  }

  console.log('\n');

  // Example 5: Image comparison
  console.log('5️⃣ Image Comparison:');
  console.log('-'.repeat(60));

  if (process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    // Image comparison prompt would be used here with actual images
    console.log('Image comparison prompt prepared.');
    console.log('To use: Provide two image URLs or base64 encoded images');
  }

  console.log('\n');

  // Example 6: Code from screenshots
  console.log('6️⃣ Code Extraction from Screenshots:');
  console.log('-'.repeat(60));

  if (process.env.ANTHROPIC_API_KEY) {
    // Code extraction prompt would be used here with an actual image
    console.log('Code extraction prompt prepared.');
    console.log('To use: Provide a screenshot of code');
  }

  console.log('\n💡 Vision API Usage Tips:');
  console.log('-'.repeat(60));
  console.log('1. For OpenAI: Use gpt-4o or gpt-4-vision-preview models');
  console.log('2. For Claude: Use claude-3-opus or claude-3-5-sonnet');
  console.log('3. Images can be provided as URLs or base64 encoded');
  console.log('4. Keep image sizes reasonable (< 20MB recommended)');
  console.log('5. For Azure OpenAI, ensure your deployment supports vision');
  console.log('6. Vision models consume more tokens - monitor costs');
}

visionExample().catch(console.error);
