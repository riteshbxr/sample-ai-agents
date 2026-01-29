import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Guardrail,
  LengthGuardrail,
  FormatGuardrail,
  ContentPolicyGuardrail,
  PIIGuardrail,
  GuardrailsEngine,
} from '../../src/examples/strategies/guardrails/guardrails.js';

describe('Guardrail (Base Class)', () => {
  it('should initialize with name and description', () => {
    const guardrail = new Guardrail('TestGuardrail', 'A test guardrail');
    assert.strictEqual(guardrail.name, 'TestGuardrail');
    assert.strictEqual(guardrail.description, 'A test guardrail');
    assert.strictEqual(guardrail.enabled, true);
  });

  it('should throw error when validate is not implemented', async () => {
    const guardrail = new Guardrail('Test', 'Test');
    await assert.rejects(async () => guardrail.validate('test'), {
      message: 'validate() must be implemented by subclass',
    });
  });

  it('should return unchanged output in default fix method', async () => {
    const guardrail = new Guardrail('Test', 'Test');
    const result = await guardrail.fix('original', {});
    assert.strictEqual(result, 'original');
  });
});

describe('LengthGuardrail', () => {
  describe('character count validation', () => {
    it('should pass valid length output', async () => {
      const guardrail = new LengthGuardrail({ minLength: 5, maxLength: 100 });
      const result = await guardrail.validate('Hello World');

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.issues.length, 0);
    });

    it('should fail for output that is too short', async () => {
      const guardrail = new LengthGuardrail({ minLength: 20 });
      const result = await guardrail.validate('Short');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('too short')));
    });

    it('should fail for output that is too long', async () => {
      const guardrail = new LengthGuardrail({ maxLength: 10 });
      const result = await guardrail.validate('This is a very long output');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('too long')));
    });

    it('should use default values when not specified', async () => {
      const guardrail = new LengthGuardrail();
      assert.strictEqual(guardrail.minLength, 0);
      assert.strictEqual(guardrail.maxLength, 10000);
    });
  });

  describe('word count validation', () => {
    it('should fail for too few words', async () => {
      const guardrail = new LengthGuardrail({ minWords: 10 });
      const result = await guardrail.validate('Only five words here now');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('Not enough words')));
    });

    it('should fail for too many words', async () => {
      const guardrail = new LengthGuardrail({ maxWords: 3 });
      const result = await guardrail.validate('This has more than three words');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('Too many words')));
    });

    it('should include metrics in result', async () => {
      const guardrail = new LengthGuardrail();
      const result = await guardrail.validate('Hello World');

      assert.ok(result.metrics);
      assert.strictEqual(result.metrics.charCount, 11);
      assert.strictEqual(result.metrics.wordCount, 2);
    });
  });
});

describe('FormatGuardrail', () => {
  describe('JSON validation', () => {
    it('should pass valid JSON', async () => {
      const guardrail = new FormatGuardrail(null, 'json');
      const result = await guardrail.validate('{"name": "test", "value": 123}');

      assert.strictEqual(result.valid, true);
    });

    it('should fail invalid JSON', async () => {
      const guardrail = new FormatGuardrail(null, 'json');
      const result = await guardrail.validate('not valid json');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.includes('Invalid JSON format'));
    });

    it('should validate against schema', async () => {
      const schema = {
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };
      const guardrail = new FormatGuardrail(schema, 'json');

      const validResult = await guardrail.validate('{"name": "John", "age": 30}');
      assert.strictEqual(validResult.valid, true);

      const invalidResult = await guardrail.validate('{"name": "John"}');
      assert.strictEqual(invalidResult.valid, false);
      assert.ok(invalidResult.issues.some((i) => i.includes('Missing required field')));
    });

    it('should validate property types', async () => {
      const schema = {
        properties: {
          count: { type: 'number' },
        },
      };
      const guardrail = new FormatGuardrail(schema, 'json');

      const result = await guardrail.validate('{"count": "not a number"}');
      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('Invalid type')));
    });
  });

  describe('markdown validation', () => {
    it('should warn if long markdown lacks headers', async () => {
      const guardrail = new FormatGuardrail(null, 'markdown');
      const longText = 'A'.repeat(150);
      const result = await guardrail.validate(longText);

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('headers')));
    });

    it('should pass markdown with headers', async () => {
      const guardrail = new FormatGuardrail(null, 'markdown');
      const result = await guardrail.validate(`# Title\n${'A'.repeat(150)}`);

      assert.strictEqual(result.valid, true);
    });

    it('should pass short markdown without headers', async () => {
      const guardrail = new FormatGuardrail(null, 'markdown');
      const result = await guardrail.validate('Short text');

      assert.strictEqual(result.valid, true);
    });
  });

  describe('code validation', () => {
    it('should pass code with code blocks', async () => {
      const guardrail = new FormatGuardrail(null, 'code');
      const result = await guardrail.validate('```javascript\nconsole.log("hi");\n```');

      assert.strictEqual(result.valid, true);
    });

    it('should pass code with function keyword', async () => {
      const guardrail = new FormatGuardrail(null, 'code');
      const result = await guardrail.validate('function test() { return 1; }');

      assert.strictEqual(result.valid, true);
    });

    it('should pass code with const keyword', async () => {
      const guardrail = new FormatGuardrail(null, 'code');
      const result = await guardrail.validate('const x = 5;');

      assert.strictEqual(result.valid, true);
    });

    it('should fail non-code content', async () => {
      const guardrail = new FormatGuardrail(null, 'code');
      const result = await guardrail.validate('This is just regular text without any code.');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('no code detected')));
    });
  });

  describe('text validation', () => {
    it('should pass any text', async () => {
      const guardrail = new FormatGuardrail(null, 'text');
      const result = await guardrail.validate('Any text is valid');

      assert.strictEqual(result.valid, true);
    });
  });
});

describe('ContentPolicyGuardrail', () => {
  describe('blocked terms', () => {
    it('should detect blocked terms', async () => {
      const guardrail = new ContentPolicyGuardrail({
        blockedTerms: ['forbidden', 'banned'],
      });
      const result = await guardrail.validate('This contains a forbidden word');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('forbidden')));
    });

    it('should be case insensitive', async () => {
      const guardrail = new ContentPolicyGuardrail({
        blockedTerms: ['SECRET'],
      });
      const result = await guardrail.validate('This contains a secret');

      assert.strictEqual(result.valid, false);
    });

    it('should pass when no blocked terms found', async () => {
      const guardrail = new ContentPolicyGuardrail({
        blockedTerms: ['forbidden'],
      });
      const result = await guardrail.validate('This is perfectly fine');

      assert.strictEqual(result.valid, true);
    });
  });

  describe('blocked patterns', () => {
    it('should detect blocked patterns', async () => {
      const guardrail = new ContentPolicyGuardrail({
        blockedPatterns: ['password:\\s*\\w+'],
      });
      const result = await guardrail.validate('Here is password: secret123');

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes('blocked pattern')));
    });
  });

  describe('harmful content detection', () => {
    it('should detect hacking instructions', async () => {
      const guardrail = new ContentPolicyGuardrail();
      const result = await guardrail.validate('Here is how to hack into a system');

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.severity, 'high');
    });

    it('should detect self-harm content', async () => {
      const guardrail = new ContentPolicyGuardrail();
      const result = await guardrail.validate('Instructions to harm yourself');

      assert.strictEqual(result.valid, false);
    });

    it('should pass safe content', async () => {
      const guardrail = new ContentPolicyGuardrail();
      const result = await guardrail.validate('This is a helpful and safe response about cooking.');

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.severity, 'none');
    });
  });

  describe('fix method', () => {
    it('should redact blocked terms', async () => {
      const guardrail = new ContentPolicyGuardrail({
        blockedTerms: ['secret', 'password'],
      });
      const fixed = await guardrail.fix('My secret password is hidden');

      assert.strictEqual(fixed, 'My [REDACTED] [REDACTED] is hidden');
    });
  });
});

describe('PIIGuardrail', () => {
  describe('email detection', () => {
    it('should detect email addresses', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('Contact me at test@example.com');

      assert.strictEqual(result.valid, false);
      assert.ok(result.detected.some((d) => d.type === 'email'));
    });
  });

  describe('phone number detection', () => {
    it('should detect phone numbers', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('Call me at 555-123-4567');

      assert.strictEqual(result.valid, false);
      assert.ok(result.detected.some((d) => d.type === 'phone'));
    });

    it('should detect phone numbers with dots', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('Phone: 555.123.4567');

      assert.strictEqual(result.valid, false);
    });
  });

  describe('SSN detection', () => {
    it('should detect SSN patterns', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('SSN: 123-45-6789');

      assert.strictEqual(result.valid, false);
      assert.ok(result.detected.some((d) => d.type === 'ssn'));
    });
  });

  describe('credit card detection', () => {
    it('should detect credit card numbers', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('Card: 1234-5678-9012-3456');

      assert.strictEqual(result.valid, false);
      assert.ok(result.detected.some((d) => d.type === 'creditCard'));
    });

    it('should detect credit cards with spaces', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('Card: 1234 5678 9012 3456');

      assert.strictEqual(result.valid, false);
    });
  });

  describe('IP address detection', () => {
    it('should detect IP addresses', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('Server IP: 192.168.1.100');

      assert.strictEqual(result.valid, false);
      assert.ok(result.detected.some((d) => d.type === 'ipAddress'));
    });
  });

  describe('multiple PII detection', () => {
    it('should detect multiple PII types', async () => {
      const guardrail = new PIIGuardrail();
      const result = await guardrail.validate('Email: test@example.com, Phone: 555-123-4567');

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.detected.length, 2);
    });
  });

  describe('fix method', () => {
    it('should mask PII', async () => {
      const guardrail = new PIIGuardrail();
      const fixed = await guardrail.fix(
        'Email: test@example.com, Phone: 555-123-4567, SSN: 123-45-6789'
      );

      assert.ok(fixed.includes('[EMAIL]'));
      assert.ok(fixed.includes('[PHONE]'));
      assert.ok(fixed.includes('[SSN]'));
      assert.ok(!fixed.includes('test@example.com'));
    });
  });

  describe('action configuration', () => {
    it('should include action in result', async () => {
      const warnGuardrail = new PIIGuardrail({ action: 'warn' });
      const blockGuardrail = new PIIGuardrail({ action: 'block' });

      const result1 = await warnGuardrail.validate('test@example.com');
      const result2 = await blockGuardrail.validate('test@example.com');

      assert.strictEqual(result1.action, 'warn');
      assert.strictEqual(result2.action, 'block');
    });
  });
});

describe('GuardrailsEngine', () => {
  describe('constructor', () => {
    it('should initialize with default options', () => {
      const engine = new GuardrailsEngine();
      assert.strictEqual(engine.verbose, true);
      assert.strictEqual(engine.failFast, false);
      assert.strictEqual(engine.autoFix, false);
    });

    it('should accept custom options', () => {
      const engine = new GuardrailsEngine({
        verbose: false,
        failFast: true,
        autoFix: true,
      });
      assert.strictEqual(engine.verbose, false);
      assert.strictEqual(engine.failFast, true);
      assert.strictEqual(engine.autoFix, true);
    });
  });

  describe('addGuardrail', () => {
    it('should add guardrails and return self for chaining', () => {
      const engine = new GuardrailsEngine();
      const result = engine.addGuardrail(new LengthGuardrail()).addGuardrail(new PIIGuardrail());

      assert.strictEqual(result, engine);
      assert.strictEqual(engine.guardrails.length, 2);
    });
  });

  describe('validate', () => {
    it('should run all guardrails', async () => {
      const engine = new GuardrailsEngine({ verbose: false });
      engine
        .addGuardrail(new LengthGuardrail({ minLength: 5 }))
        .addGuardrail(new ContentPolicyGuardrail());

      const result = await engine.validate('Hello World');

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.results.length, 2);
    });

    it('should collect all issues when failFast is false', async () => {
      const engine = new GuardrailsEngine({ verbose: false, failFast: false });
      engine.addGuardrail(new LengthGuardrail({ minLength: 100 })).addGuardrail(new PIIGuardrail());

      const result = await engine.validate('Email: test@example.com');

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.results.length, 2);
    });

    it('should stop on first failure when failFast is true', async () => {
      const engine = new GuardrailsEngine({ verbose: false, failFast: true });
      engine.addGuardrail(new LengthGuardrail({ minLength: 100 })).addGuardrail(new PIIGuardrail());

      const result = await engine.validate('Short');

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.results.length, 1);
    });

    it('should auto-fix when enabled', async () => {
      const engine = new GuardrailsEngine({ verbose: false, autoFix: true });
      engine.addGuardrail(new PIIGuardrail());

      const result = await engine.validate('Email: test@example.com');

      assert.strictEqual(result.wasFixed, true);
      assert.ok(result.output.includes('[EMAIL]'));
      assert.strictEqual(result.originalOutput, 'Email: test@example.com');
    });

    it('should skip disabled guardrails', async () => {
      const engine = new GuardrailsEngine({ verbose: false });
      const disabledGuardrail = new LengthGuardrail({ minLength: 1000 });
      disabledGuardrail.enabled = false;
      engine.addGuardrail(disabledGuardrail);

      const result = await engine.validate('Short text');

      assert.strictEqual(result.valid, true);
    });

    it('should pass context to guardrails', async () => {
      const engine = new GuardrailsEngine({ verbose: false });
      let receivedContext = null;

      const customGuardrail = new Guardrail('Custom', 'Test');
      customGuardrail.validate = async (output, context) => {
        receivedContext = context;
        return { valid: true, issues: [] };
      };

      engine.addGuardrail(customGuardrail);
      await engine.validate('test', { testKey: 'testValue' });

      assert.deepStrictEqual(receivedContext, { testKey: 'testValue' });
    });
  });

  describe('static factory methods', () => {
    it('should create default engine', () => {
      const engine = GuardrailsEngine.createDefault();
      assert.ok(engine instanceof GuardrailsEngine);
      assert.strictEqual(engine.autoFix, true);
      assert.ok(engine.guardrails.length > 0);
    });

    it('should create strict engine', () => {
      const engine = GuardrailsEngine.createStrict('mock');
      assert.ok(engine instanceof GuardrailsEngine);
      assert.strictEqual(engine.failFast, true);
      assert.ok(engine.guardrails.length > 0);
    });
  });
});
