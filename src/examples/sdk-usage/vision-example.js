import { createAIClient } from '../../clients/client-factory.js';
import { config } from '../../config.js';
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

  // Helper function to create a simple test image (1x1 pixel PNG) as base64
  // This is a minimal valid PNG that can be used for testing
  function createTestImageBase64() {
    // Minimal 1x1 pixel red PNG in base64
    // This is a valid PNG that can be used for testing vision API
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  // Example 1: Image description with OpenAI
  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    // Force use of standard OpenAI for vision API (works better with vision models)
    const openaiClient = createAIClient('openai-standard');
    console.log(`1️⃣ Image Description (OpenAI ${config.openai.visionModel}):`);
    console.log('-'.repeat(60));

    // Note: For vision, you need to provide an image URL or base64
    // Try local image first, then fallback to test image
    const imagePath = './example-image.png'; // Replace with your image

    let imageBase64 = null;

    if (fs.existsSync(imagePath)) {
      imageBase64 = encodeImage(imagePath);
      if (imageBase64) {
        console.log('   Using local image file');
      }
    }

    // If no local image, use a simple test image (1x1 pixel PNG)
    // This ensures the example works without external dependencies
    if (!imageBase64) {
      imageBase64 = createTestImageBase64();
      console.log(
        '   Using test image (1x1 pixel PNG) - replace with your own image for better results'
      );
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
            : []),
        ],
      },
    ];

    try {
      // Note: Vision models may have different model names
      // Use config.openai.visionModel for vision-specific model
      const response = await openaiClient.client.chat.completions.create({
        model: config.openai.visionModel, // Use dedicated vision model from config
        messages,
        max_tokens: 300,
      });

      console.log('Image Description:');
      console.log(response.choices[0].message.content);
    } catch (error) {
      console.log('⚠️ Vision API error occurred');
      console.log('   Error:', error.message);

      if (error.message.includes('downloading') || error.status === 400) {
        console.log('\n💡 Troubleshooting:');
        console.log('   - Image URL might be inaccessible or invalid');
        console.log('   - Try using a local image file instead (base64 encoded)');
        console.log('   - Ensure the image URL is publicly accessible');
        console.log('   - Some URLs may be blocked by the API');
      } else if (error.message.includes('model') || error.message.includes('deployment')) {
        console.log('\n💡 Troubleshooting:');
        console.log(`   - Make sure ${config.openai.visionModel} supports vision capabilities`);
        console.log('   - For Azure OpenAI, ensure your deployment supports vision');
        console.log(
          '   - Try setting OPENAI_VISION_MODEL to a vision-capable model (e.g., gpt-4o)'
        );
      } else {
        console.log('\n💡 Troubleshooting:');
        console.log(`   - Verify ${config.openai.visionModel} is a valid vision-capable model`);
        console.log('   - Check your API key has access to vision models');
        console.log('   - Ensure the model supports image inputs');
      }
    }
  }

  console.log('\n');

  // Example 2: Image analysis with Claude
  if (config.claude.apiKey) {
    const claudeClient = createAIClient('claude');
    console.log(`2️⃣ Image Analysis (Claude ${claudeClient.model || config.claude.model}):`);
    console.log('-'.repeat(60));

    // Use test image (base64) to avoid URL download issues
    const testImageBase64 = createTestImageBase64();
    console.log(
      '   Using test image (1x1 pixel PNG) - replace with your own image for better results'
    );

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
                  type: 'base64',
                  media_type: 'image/png',
                  data: testImageBase64,
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

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    // Example: Extract text from an image
    // OCR prompt would be used here with an actual image file
    console.log('OCR Prompt prepared. (Requires actual image file)');
    console.log('To use: Provide an image path with text content');
  }

  console.log('\n');

  // Example 4: Visual question answering
  console.log('4️⃣ Visual Question Answering:');
  console.log('-'.repeat(60));

  if (config.claude.apiKey) {
    const claudeClient = createAIClient('claude');

    // Use test image (base64) to avoid URL download issues
    const testImageBase64 = createTestImageBase64();
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
                    type: 'base64',
                    media_type: 'image/png',
                    data: testImageBase64,
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

  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    // Image comparison prompt would be used here with actual images
    console.log('Image comparison prompt prepared.');
    console.log('To use: Provide two image URLs or base64 encoded images');
  }

  console.log('\n');

  // Example 6: Code from screenshots
  console.log('6️⃣ Code Extraction from Screenshots:');
  console.log('-'.repeat(60));

  if (config.claude.apiKey) {
    // Code extraction prompt would be used here with an actual image
    console.log('Code extraction prompt prepared.');
    console.log('To use: Provide a screenshot of code');
  }

  console.log('\n💡 Vision API Usage Tips:');
  console.log('-'.repeat(60));
  if (config.openai.azureApiKey || config.openai.standardApiKey) {
    console.log(
      `1. For OpenAI: Using ${config.openai.visionModel} for vision (configured via OPENAI_VISION_MODEL)`
    );
  }
  if (config.claude.apiKey) {
    console.log(`2. For Claude: Using ${config.claude.model} (supports vision)`);
  }
  console.log('3. Images can be provided as URLs or base64 encoded');
  console.log('4. Keep image sizes reasonable (< 20MB recommended)');
  console.log('5. For Azure OpenAI, ensure your deployment supports vision');
  console.log('6. Vision models consume more tokens - monitor costs');
}

visionExample().catch(console.error);
