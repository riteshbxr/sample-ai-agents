import { VisionService } from '../../services/vision-service.js';
import { config, providerUtils } from '../../config.js';
import fs from 'fs';

/**
 * Vision/Image Analysis Example
 * Demonstrates image analysis capabilities with GPT-4 Vision and Claude 3.5
 */
async function visionExample() {
  console.log('=== Vision/Image Analysis Example ===\n');

  const visionService = new VisionService();

  // Example 1: Image description with OpenAI
  if (providerUtils.isProviderAvailable('openai')) {
    console.log(`1️⃣ Image Description (OpenAI ${config.openai.visionModel}):`);
    console.log('-'.repeat(60));

    // Try local image first, then fallback to test image
    const imagePath = './example-image.png'; // Replace with your image
    let image = null;

    if (fs.existsSync(imagePath)) {
      image = imagePath;
      console.log('   Using local image file');
    } else {
      image = visionService.createTestImageBase64();
      console.log(
        '   Using test image (1x1 pixel PNG) - replace with your own image for better results'
      );
    }

    try {
      const description = await visionService.analyzeImage(
        image,
        'Describe this image in detail. What do you see?',
        { model: config.openai.visionModel, max_tokens: 300 }
      );
      console.log('Image Description:');
      console.log(description);
    } catch (error) {
      console.log('⚠️ Vision API error occurred');
      console.log('   Error:', error.message);
    }
  }

  console.log('\n');

  // Example 2: Image analysis with Claude
  if (providerUtils.isProviderAvailable('claude')) {
    const claudeVisionService = new VisionService('claude');
    console.log(`2️⃣ Image Analysis (Claude ${providerUtils.getDefaultModel('claude')}):`);
    console.log('-'.repeat(60));

    const testImage = claudeVisionService.createTestImageBase64();
    console.log(
      '   Using test image (1x1 pixel PNG) - replace with your own image for better results'
    );

    try {
      const analysis = await claudeVisionService.analyzeImage(
        testImage,
        'Analyze this image. What are the main elements? What mood or atmosphere does it convey?',
        { max_tokens: 1024 }
      );
      console.log('Image Analysis:');
      console.log(analysis);
    } catch (error) {
      console.log('⚠️ Vision API error:', error.message);
    }
  }

  console.log('\n');

  // Example 3: Document/image OCR
  console.log('3️⃣ Document OCR (Text Extraction):');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    // Example: Extract text from an image
    // OCR prompt would be used here with an actual image file
    console.log('OCR Prompt prepared. (Requires actual image file)');
    console.log('To use: Provide an image path with text content');
  }

  console.log('\n');

  // Example 4: Visual question answering
  console.log('4️⃣ Visual Question Answering:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('claude')) {
    const claudeVisionService = new VisionService('claude');
    const testImage = claudeVisionService.createTestImageBase64();
    const questions = [
      'What type of environment is shown in this image?',
      'What colors dominate the image?',
      'What time of day does this appear to be?',
    ];

    try {
      const answers = await claudeVisionService.answerQuestions(testImage, questions, {
        max_tokens: 200,
      });
      for (const question of questions) {
        console.log(`Q: ${question}`);
        console.log(`A: ${answers[question]}\n`);
      }
    } catch (error) {
      console.log(`Error answering: ${error.message}\n`);
    }
  }

  console.log('\n');

  // Example 5: Image comparison
  console.log('5️⃣ Image Comparison:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('openai')) {
    // Image comparison prompt would be used here with actual images
    console.log('Image comparison prompt prepared.');
    console.log('To use: Provide two image URLs or base64 encoded images');
  }

  console.log('\n');

  // Example 6: Code from screenshots
  console.log('6️⃣ Code Extraction from Screenshots:');
  console.log('-'.repeat(60));

  if (providerUtils.isProviderAvailable('claude')) {
    // Code extraction prompt would be used here with an actual image
    console.log('Code extraction prompt prepared.');
    console.log('To use: Provide a screenshot of code');
  }

  console.log('\n💡 Vision API Usage Tips:');
  console.log('-'.repeat(60));
  if (providerUtils.isProviderAvailable('openai')) {
    console.log(
      `1. For OpenAI: Using ${config.openai.visionModel} for vision (configured via OPENAI_VISION_MODEL)`
    );
  }
  if (providerUtils.isProviderAvailable('claude')) {
    console.log(
      `2. For Claude: Using ${providerUtils.getDefaultModel('claude')} (supports vision)`
    );
  }
  console.log('3. Images can be provided as URLs or base64 encoded');
  console.log('4. Keep image sizes reasonable (< 20MB recommended)');
  console.log('5. For Azure OpenAI, ensure your deployment supports vision');
  console.log('6. Vision models consume more tokens - monitor costs');
}

visionExample().catch(console.error);
