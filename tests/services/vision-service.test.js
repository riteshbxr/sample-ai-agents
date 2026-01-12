import { test } from 'node:test';
import assert from 'node:assert';
import { VisionService } from '../../src/services/vision-service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('VisionService - constructor with explicit provider', () => {
  const service = new VisionService('mock');
  assert.strictEqual(service.provider, 'mock');
  assert.ok(service.client);
});

test('VisionService - createTestImageBase64 returns valid base64', () => {
  const service = new VisionService('mock');

  const base64 = service.createTestImageBase64();

  assert.ok(typeof base64 === 'string');
  assert.ok(base64.length > 0);
  // Base64 should not contain whitespace
  assert.ok(!/\s/.test(base64));
});

test('VisionService - encodeImageToBase64 with valid file', () => {
  const service = new VisionService('mock');

  // Create a temporary test file
  const testImagePath = path.join(__dirname, 'test-image.txt');
  fs.writeFileSync(testImagePath, 'test image content');

  const base64 = service.encodeImageToBase64(testImagePath);

  assert.ok(typeof base64 === 'string');
  assert.ok(base64.length > 0);

  // Cleanup
  fs.unlinkSync(testImagePath);
});

test('VisionService - encodeImageToBase64 with invalid file returns null', () => {
  const service = new VisionService('mock');

  const base64 = service.encodeImageToBase64('/nonexistent/path/image.png');

  assert.strictEqual(base64, null);
});

test('VisionService - analyzeImage with base64 string', async () => {
  const service = new VisionService('mock');

  // Mock the analyzeImage method
  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    return 'This is a test image';
  };

  const testImageBase64 = service.createTestImageBase64();
  const result = await service.analyzeImage(testImageBase64, 'What is in this image?');

  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('VisionService - analyzeImage with data URL', async () => {
  const service = new VisionService('mock');

  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    return 'Image analysis result';
  };

  const testImageBase64 = service.createTestImageBase64();
  const dataUrl = `data:image/png;base64,${testImageBase64}`;
  const result = await service.analyzeImage(dataUrl, 'Describe this image');

  assert.ok(typeof result === 'string');
});

test('VisionService - analyzeImage with Buffer', async () => {
  const service = new VisionService('mock');

  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    return 'Buffer image analysis';
  };

  const imageBuffer = Buffer.from('test image buffer');
  const result = await service.analyzeImage(imageBuffer, 'What is this?');

  assert.ok(typeof result === 'string');
});

test('VisionService - analyzeImage with file path', async () => {
  const service = new VisionService('mock');

  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    return 'File image analysis';
  };

  // Create a temporary test file
  const testImagePath = path.join(__dirname, 'test-image.txt');
  fs.writeFileSync(testImagePath, 'test image content');

  const result = await service.analyzeImage(testImagePath, 'Analyze this image');

  assert.ok(typeof result === 'string');

  // Cleanup
  fs.unlinkSync(testImagePath);
});

test('VisionService - analyzeImage throws error for invalid input', async () => {
  const service = new VisionService('mock');

  await assert.rejects(
    async () => {
      await service.analyzeImage(null, 'Prompt');
    },
    {
      message: /Invalid image input/,
    }
  );
});

test('VisionService - analyzeImage with Claude provider', async () => {
  const service = new VisionService('mock');
  service.provider = 'claude';

  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    return 'Claude vision analysis';
  };

  const testImageBase64 = service.createTestImageBase64();
  const result = await service.analyzeImage(testImageBase64, 'What do you see?');

  assert.ok(typeof result === 'string');
});

test('VisionService - analyzeImage with options', async () => {
  const service = new VisionService('mock');

  let capturedOptions = null;
  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    capturedOptions = options;
    return 'Analysis result';
  };

  const testImageBase64 = service.createTestImageBase64();
  await service.analyzeImage(testImageBase64, 'Analyze', {
    temperature: 0.7,
    max_tokens: 500,
  });

  assert.ok(capturedOptions);
  assert.strictEqual(capturedOptions.temperature, 0.7);
  assert.strictEqual(capturedOptions.max_tokens, 500);
});

test('VisionService - analyzeImage throws error for unsupported provider', async () => {
  // Create a service with an unsupported provider by directly setting it
  const service = new VisionService('mock');
  service.provider = 'unsupported-provider';

  // Set analyzeImage to undefined to simulate unsupported provider
  service.client.analyzeImage = undefined;

  const testImageBase64 = service.createTestImageBase64();

  await assert.rejects(
    async () => {
      await service.analyzeImage(testImageBase64, 'Prompt');
    },
    {
      message: /Vision not supported for provider/,
    }
  );
});

test('VisionService - extractText with OCR', async () => {
  const service = new VisionService('mock');

  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    // Verify OCR prompt is used
    assert.ok(prompt.includes('Extract all text'));
    assert.ok(prompt.includes('Return only the text content'));
    return 'Extracted text: Hello World';
  };

  const testImageBase64 = service.createTestImageBase64();
  const result = await service.extractText(testImageBase64);

  assert.ok(typeof result === 'string');
  assert.ok(result.includes('Extracted text'));
});

test('VisionService - extractText with options', async () => {
  const service = new VisionService('mock');

  let capturedOptions = null;
  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    capturedOptions = options;
    return 'Text content';
  };

  const testImageBase64 = service.createTestImageBase64();
  await service.extractText(testImageBase64, { temperature: 0.3, max_tokens: 200 });

  assert.ok(capturedOptions);
  assert.strictEqual(capturedOptions.temperature, 0.3);
  assert.strictEqual(capturedOptions.max_tokens, 200);
});

test('VisionService - extractText with file path', async () => {
  const service = new VisionService('mock');

  service.client.analyzeImage = async (imageBase64, prompt) => {
    return 'Text from file image';
  };

  // Create a temporary test file
  const testImagePath = path.join(__dirname, 'test-ocr-image.txt');
  fs.writeFileSync(testImagePath, 'test image content');

  const result = await service.extractText(testImagePath);

  assert.ok(typeof result === 'string');
  assert.strictEqual(result, 'Text from file image');

  // Cleanup
  fs.unlinkSync(testImagePath);
});

test('VisionService - answerQuestions with single question', async () => {
  const service = new VisionService('mock');

  service.client.analyzeImage = async (imageBase64, prompt) => {
    return `Answer to: ${prompt}`;
  };

  const testImageBase64 = service.createTestImageBase64();
  const result = await service.answerQuestions(testImageBase64, 'What is in this image?');

  assert.ok(typeof result === 'string');
  assert.ok(result.includes('What is in this image?'));
});

test('VisionService - answerQuestions with multiple questions', async () => {
  const service = new VisionService('mock');

  let callCount = 0;
  service.client.analyzeImage = async (imageBase64, prompt) => {
    callCount++;
    return `Answer ${callCount} to: ${prompt}`;
  };

  const testImageBase64 = service.createTestImageBase64();
  const questions = ['What is in this image?', 'What colors are present?', 'Describe the scene'];

  const result = await service.answerQuestions(testImageBase64, questions);

  assert.ok(typeof result === 'object');
  assert.strictEqual(callCount, 3);
  assert.ok(result['What is in this image?']);
  assert.ok(result['What colors are present?']);
  assert.ok(result['Describe the scene']);
  assert.strictEqual(Object.keys(result).length, 3);
});

test('VisionService - answerQuestions with multiple questions and options', async () => {
  const service = new VisionService('mock');

  let capturedOptions = null;
  service.client.analyzeImage = async (imageBase64, prompt, options) => {
    capturedOptions = options;
    return 'Answer';
  };

  const testImageBase64 = service.createTestImageBase64();
  const questions = ['Question 1', 'Question 2'];

  await service.answerQuestions(testImageBase64, questions, {
    temperature: 0.5,
    max_tokens: 300,
  });

  assert.ok(capturedOptions);
  assert.strictEqual(capturedOptions.temperature, 0.5);
  assert.strictEqual(capturedOptions.max_tokens, 300);
});

test('VisionService - answerQuestions preserves question order', async () => {
  const service = new VisionService('mock');

  const callOrder = [];
  service.client.analyzeImage = async (imageBase64, prompt) => {
    callOrder.push(prompt);
    return `Answer to ${prompt}`;
  };

  const testImageBase64 = service.createTestImageBase64();
  const questions = ['First question', 'Second question', 'Third question'];

  const result = await service.answerQuestions(testImageBase64, questions);

  assert.strictEqual(callOrder.length, 3);
  assert.strictEqual(callOrder[0], 'First question');
  assert.strictEqual(callOrder[1], 'Second question');
  assert.strictEqual(callOrder[2], 'Third question');
  assert.ok(result['First question']);
  assert.ok(result['Second question']);
  assert.ok(result['Third question']);
});
