import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InputValidator } from '../../src/examples/strategies/security/input-validator.js';

describe('InputValidator', () => {
  describe('length validation', () => {
    it('should pass valid length input', () => {
      const result = InputValidator.validate('Hello world');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject input that is too short', () => {
      const result = InputValidator.validate('', { minLength: 1 });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Input too short'));
    });

    it('should reject input that is too long', () => {
      const longInput = 'a'.repeat(100);
      const result = InputValidator.validate(longInput, { maxLength: 50 });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Input too long'));
    });

    it('should use default maxLength of 10000', () => {
      const longInput = 'a'.repeat(10001);
      const result = InputValidator.validate(longInput);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Input too long'));
    });

    it('should accept input at exact max length', () => {
      const input = 'a'.repeat(100);
      const result = InputValidator.validate(input, { maxLength: 100 });
      assert.strictEqual(result.valid, true);
    });
  });

  describe('URL blocking', () => {
    it('should block HTTP URLs by default', () => {
      const result = InputValidator.validate('Check out http://example.com');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('URLs not allowed'));
    });

    it('should block HTTPS URLs by default', () => {
      const result = InputValidator.validate('Visit https://secure.example.com');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('URLs not allowed'));
    });

    it('should allow URLs when blockUrls is false', () => {
      const result = InputValidator.validate('Check http://example.com', {
        blockUrls: false,
      });
      assert.strictEqual(result.valid, true);
    });

    it('should allow text without URLs', () => {
      const result = InputValidator.validate('No links here');
      assert.strictEqual(result.valid, true);
    });
  });

  describe('email blocking', () => {
    it('should allow emails by default', () => {
      const result = InputValidator.validate('Contact me at test@example.com');
      assert.strictEqual(result.valid, true);
    });

    it('should block emails when blockEmails is true', () => {
      const result = InputValidator.validate('Email me at user@domain.com', {
        blockEmails: true,
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Email addresses not allowed'));
    });

    it('should detect various email formats', () => {
      const emails = ['simple@example.com', 'user.name@domain.org', 'user-name@sub.domain.co.uk'];

      for (const email of emails) {
        const result = InputValidator.validate(`Contact: ${email}`, {
          blockEmails: true,
        });
        assert.strictEqual(result.valid, false, `Should block: ${email}`);
      }
    });
  });

  describe('character validation', () => {
    it('should allow any characters when allowedChars is null', () => {
      const result = InputValidator.validate('Hello! @#$% 123');
      assert.strictEqual(result.valid, true);
    });

    it('should only allow specified characters', () => {
      const result = InputValidator.validate('abc123', {
        allowedChars: 'a-z0-9',
      });
      assert.strictEqual(result.valid, true);
    });

    it('should reject invalid characters', () => {
      const result = InputValidator.validate('abc!@#', {
        allowedChars: 'a-z0-9',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Invalid characters'));
    });

    it('should allow alphanumeric and spaces', () => {
      const result = InputValidator.validate('Hello World 123', {
        allowedChars: 'a-zA-Z0-9 ',
      });
      assert.strictEqual(result.valid, true);
    });
  });

  describe('multiple validations', () => {
    it('should report all validation errors', () => {
      const result = InputValidator.validate('http://a.com test@mail.com', {
        maxLength: 10,
        blockUrls: true,
        blockEmails: true,
      });

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Input too long'));
      assert.ok(result.errors.includes('URLs not allowed'));
      assert.ok(result.errors.includes('Email addresses not allowed'));
      assert.strictEqual(result.errors.length, 3);
    });

    it('should pass when all validations succeed', () => {
      const result = InputValidator.validate('Valid input here', {
        minLength: 5,
        maxLength: 100,
        blockUrls: true,
        blockEmails: true,
      });

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options', () => {
      const result = InputValidator.validate('Test input', {});
      assert.strictEqual(result.valid, true);
    });

    it('should handle single character input', () => {
      const result = InputValidator.validate('a');
      assert.strictEqual(result.valid, true);
    });

    it('should handle unicode characters', () => {
      const result = InputValidator.validate('Hello 世界 🌍');
      assert.strictEqual(result.valid, true);
    });

    it('should handle newlines and tabs', () => {
      const result = InputValidator.validate('Line1\nLine2\tTabbed');
      assert.strictEqual(result.valid, true);
    });
  });
});
