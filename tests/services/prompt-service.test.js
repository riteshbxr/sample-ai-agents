import { test } from 'node:test';
import assert from 'node:assert';
import { PromptService } from '../../src/services/prompt-service.js';
import { MockAIClient } from '../../src/clients/mock-client.js';

test('PromptService - constructor with explicit provider', () => {
  const service = new PromptService('openai');
  assert.strictEqual(service.provider, 'openai');
  assert.ok(service.client);
});

test('PromptService - create few-shot prompt', () => {
  const service = new PromptService('openai');

  const examples = [
    { input: 'I love this!', output: 'positive' },
    { input: 'This is terrible', output: 'negative' },
    { input: "It's okay", output: 'neutral' },
  ];

  const prompt = service.createFewShotPrompt(
    examples,
    'I really enjoy this product',
    'Classify the sentiment'
  );

  assert.ok(prompt.includes('Classify the sentiment'));
  assert.ok(prompt.includes('I love this!'));
  assert.ok(prompt.includes('positive'));
  assert.ok(prompt.includes('I really enjoy this product'));
});

test('PromptService - create few-shot prompt without task description', () => {
  const service = new PromptService('openai');

  const examples = [{ input: 'Hello', output: 'Hi' }];
  const prompt = service.createFewShotPrompt(examples, 'Goodbye');

  assert.ok(prompt.includes('Input: Hello'));
  assert.ok(prompt.includes('Output: Hi'));
  assert.ok(prompt.includes('Input: Goodbye'));
  assert.ok(prompt.includes('Output:'));
});

test('PromptService - create chain-of-thought prompt', () => {
  const service = new PromptService('openai');

  const prompt = service.createChainOfThoughtPrompt('Solve 2x + 5 = 15');

  assert.ok(prompt.includes('Solve this step by step'));
  assert.ok(prompt.includes('Problem: Solve 2x + 5 = 15'));
  assert.ok(prompt.includes("Let's think step by step"));
});

test('PromptService - create chain-of-thought prompt with steps array', () => {
  const service = new PromptService('openai');

  const steps = ['Isolate x', 'Divide by coefficient', 'Check answer'];
  const prompt = service.createChainOfThoughtPrompt('Solve equation', steps);

  assert.ok(prompt.includes('1. Isolate x'));
  assert.ok(prompt.includes('2. Divide by coefficient'));
  assert.ok(prompt.includes('3. Check answer'));
});

test('PromptService - create chain-of-thought prompt with steps string', () => {
  const service = new PromptService('openai');

  const prompt = service.createChainOfThoughtPrompt('Problem', 'Step 1: Do this');

  assert.ok(prompt.includes('1. Step 1: Do this'));
});

test('PromptService - create role-playing prompt', () => {
  const service = new PromptService('openai');

  const prompt = service.createRolePlayingPrompt('a math teacher', 'Explain algebra');

  assert.ok(prompt.includes('You are a math teacher'));
  assert.ok(prompt.includes('Explain algebra'));
});

test('PromptService - create role-based prompt', () => {
  const service = new PromptService('openai');

  const prompt = service.createRoleBasedPrompt('a chef', 'Write a recipe', 'for beginners');

  assert.ok(prompt.includes('You are a chef'));
  assert.ok(prompt.includes('Write a recipe'));
  assert.ok(prompt.includes('for beginners'));
});

test('PromptService - create role-based prompt without audience', () => {
  const service = new PromptService('openai');

  const prompt = service.createRoleBasedPrompt('a writer', 'Write a story');

  assert.ok(prompt.includes('You are a writer'));
  assert.ok(prompt.includes('Write a story'));
});

test('PromptService - create formatting prompt with string format', () => {
  const service = new PromptService('openai');

  const prompt = service.createFormattingPrompt('Extract data', 'JSON format');

  assert.ok(prompt.includes('Extract data'));
  assert.ok(prompt.includes('Format the output as'));
  assert.ok(prompt.includes('JSON format'));
});

test('PromptService - create formatting prompt with object format', () => {
  const service = new PromptService('openai');

  const format = { type: 'object', properties: { name: { type: 'string' } } };
  const prompt = service.createFormattingPrompt('Extract person', format);

  assert.ok(prompt.includes('Extract person'));
  assert.ok(prompt.includes('"type": "object"'));
});

test('PromptService - create constrained prompt', () => {
  const service = new PromptService('openai');

  const constraints = {
    maxLength: 100,
    tone: 'professional',
    include: ['introduction', 'conclusion'],
  };
  const prompt = service.createConstrainedPrompt('Write an essay', constraints);

  assert.ok(prompt.includes('Write an essay'));
  assert.ok(typeof prompt === 'string');
  assert.ok(prompt.length > 0);
});

test('PromptService - create structured output prompt', () => {
  const service = new PromptService('openai');

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
  };
  const prompt = service.createStructuredOutputPrompt('Extract person info', schema);

  assert.ok(prompt.includes('Extract person info'));
  assert.ok(prompt.includes('JSON'));
  assert.ok(prompt.includes('schema'));
});

test('PromptService - few-shot learning execution', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'positive',
  });

  const service = new PromptService('openai');
  service.client = mockClient;

  const examples = [
    { input: 'Great product', output: 'positive' },
    { input: 'Bad quality', output: 'negative' },
  ];

  const result = await service.fewShotLearning(examples, 'Amazing!', 'Classify sentiment');

  assert.strictEqual(result, 'positive');
});

test('PromptService - chain-of-thought execution', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'x = 5',
  });

  const service = new PromptService('openai');
  service.client = mockClient;

  const result = await service.chainOfThought('Solve 2x + 5 = 15');

  assert.ok(result.includes('x = 5') || result.includes('5'));
});

test('PromptService - role-playing execution', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'As a teacher, I would explain...',
  });

  const service = new PromptService('openai');
  service.client = mockClient;

  const result = await service.rolePlaying('a math teacher', 'Explain algebra');

  assert.ok(result.includes('teacher') || result.length > 0);
});

test('PromptService - self-consistency check', async () => {
  const mockClient = new MockAIClient({
    defaultResponse: 'Consistent answer',
  });

  const service = new PromptService('openai');
  service.client = mockClient;

  const result = await service.selfConsistency('What is 2+2?', 3);

  assert.ok(typeof result === 'object');
  assert.ok(result.mostCommonAnswer !== undefined);
  assert.ok(Array.isArray(result.allAnswers));
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});

test('PromptService - extract structured data', async () => {
  const mockClient = new MockAIClient({
    chatHandler: async () => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({ name: 'John', age: 30 }),
            },
          },
        ],
      };
    },
  });

  const service = new PromptService('openai');
  service.client = mockClient;

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
  };

  const result = await service.extractStructuredData('John is 30 years old', schema);

  assert.ok(typeof result === 'object');
  assert.ok(result.name || result.age);
});
