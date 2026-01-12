import { createAIClient } from '../clients/client-factory.js';
import { providerUtils } from '../config.js';
import fs from 'fs';

/**
 * Vision Service
 * Provides reusable image analysis and vision capabilities
 */
export class VisionService {
  constructor(provider = null) {
    this.provider = provider || providerUtils.getDefaultVisionProvider();
    this.client = createAIClient(this.provider);
  }

  /**
   * Encode image file to base64
   * @param {string} imagePath - Path to image file
   * @returns {string|null} Base64 encoded image or null if error
   */
  encodeImageToBase64(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.warn(`Could not read image: ${imagePath}`);
      return null;
    }
  }

  /**
   * Create a minimal test image (1x1 pixel PNG) as base64
   * @returns {string} Base64 encoded test image
   */
  createTestImageBase64() {
    // Minimal 1x1 pixel red PNG in base64
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  /**
   * Analyze an image with a text prompt
   * @param {string|Buffer} image - Image path, base64 string, or buffer
   * @param {string} prompt - Text prompt for analysis
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Analysis result
   * @example
   * const service = new VisionService();
   * // Using file path
   * const result = await service.analyzeImage('./image.png', 'What is in this image?');
   * // Using base64
   * const base64 = service.createTestImageBase64();
   * const result2 = await service.analyzeImage(base64, 'Describe this image', {
   *   temperature: 0.7,
   *   max_tokens: 500
   * });
   */
  async analyzeImage(image, prompt, options = {}) {
    let imageBase64 = null;

    // Handle different image input types
    if (typeof image === 'string') {
      if (image.startsWith('data:image')) {
        // Already base64 with data URL
        imageBase64 = image.split(',')[1];
      } else if (fs.existsSync(image)) {
        // File path
        imageBase64 = this.encodeImageToBase64(image);
      } else {
        // Assume it's already base64
        imageBase64 = image;
      }
    } else if (Buffer.isBuffer(image)) {
      imageBase64 = image.toString('base64');
    }

    if (!imageBase64) {
      throw new Error('Invalid image input');
    }

    // Check if client supports vision/analyzeImage
    if (typeof this.client.analyzeImage === 'function') {
      return this.client.analyzeImage(imageBase64, prompt, options);
    }

    throw new Error(`Vision not supported for provider: ${this.provider}`);
  }

  /**
   * Extract text from image (OCR)
   * @param {string|Buffer} image - Image to extract text from
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Extracted text
   * @example
   * const service = new VisionService();
   * // Extract text from a document image
   * const text = await service.extractText('./document.png');
   * console.log('Extracted text:', text);
   * // Output: "Extracted text: Hello World\nThis is a document..."
   */
  async extractText(image, options = {}) {
    const prompt =
      'Extract all text from this image. Return only the text content, no additional commentary.';
    return this.analyzeImage(image, prompt, options);
  }

  /**
   * Answer questions about an image
   * @param {string|Buffer} image - Image to analyze
   * @param {string|Array<string>} questions - Question(s) to ask
   * @param {Object} options - Additional options
   * @returns {Promise<string|Object>} Answer(s) to question(s)
   * @example
   * const service = new VisionService();
   * // Single question
   * const answer = await service.answerQuestions('./photo.jpg', 'What is in this image?');
   * // Multiple questions
   * const answers = await service.answerQuestions('./photo.jpg', [
   *   'What is in this image?',
   *   'What colors are present?',
   *   'Describe the scene'
   * ]);
   * console.log(answers['What is in this image?']);
   */
  async answerQuestions(image, questions, options = {}) {
    const questionList = Array.isArray(questions) ? questions : [questions];
    const results = {};

    for (const question of questionList) {
      const answer = await this.analyzeImage(image, question, options);
      results[question] = answer;
    }

    return Array.isArray(questions) ? results : results[questions];
  }
}
