import { createAIClient } from '../../../clients/client-factory.js';

/**
 * Guardrails - Output Validation and Safety
 * A comprehensive system for validating, filtering, and constraining AI outputs.
 *
 * Key Concepts:
 * - Output Validation: Verify AI responses meet quality standards
 * - Content Filtering: Remove inappropriate or harmful content
 * - Format Enforcement: Ensure outputs match expected schemas
 * - Factual Checking: Validate claims against known facts
 * - Consistency Checking: Ensure outputs align with context
 *
 * Based on:
 * - NeMo Guardrails (NVIDIA)
 * - Guardrails AI
 * - Constitutional AI principles
 */

/**
 * Base Guardrail class
 */
export class Guardrail {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.enabled = true;
  }

  /**
   * Validate output against this guardrail
   * @param {string} output - The output to validate
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Validation result
   */
  // eslint-disable-next-line no-unused-vars
  async validate(output, context = {}) {
    throw new Error('validate() must be implemented by subclass');
  }

  /**
   * Fix output that failed validation (if possible)
   * @param {string} output - The output to fix
   * @param {Object} _validationResult - The validation result (unused in base class)
   * @returns {Promise<string>} Fixed output
   */
  // eslint-disable-next-line no-unused-vars
  async fix(output, _validationResult) {
    return output; // Default: return unchanged
  }
}

/**
 * Length Guardrail - Validates output length
 */
export class LengthGuardrail extends Guardrail {
  constructor(options = {}) {
    super('LengthGuardrail', 'Validates output length constraints');
    this.minLength = options.minLength || 0;
    this.maxLength = options.maxLength || 10000;
    this.minWords = options.minWords || 0;
    this.maxWords = options.maxWords || Infinity;
  }

  async validate(output) {
    const charCount = output.length;
    const wordCount = output.split(/\s+/).filter((w) => w.length > 0).length;
    const issues = [];

    if (charCount < this.minLength) {
      issues.push(`Output too short: ${charCount} chars (min: ${this.minLength})`);
    }
    if (charCount > this.maxLength) {
      issues.push(`Output too long: ${charCount} chars (max: ${this.maxLength})`);
    }
    if (wordCount < this.minWords) {
      issues.push(`Not enough words: ${wordCount} (min: ${this.minWords})`);
    }
    if (wordCount > this.maxWords) {
      issues.push(`Too many words: ${wordCount} (max: ${this.maxWords})`);
    }

    return {
      valid: issues.length === 0,
      issues,
      metrics: { charCount, wordCount },
    };
  }
}

/**
 * Format Guardrail - Validates output format (JSON, etc.)
 */
export class FormatGuardrail extends Guardrail {
  constructor(schema = null, format = 'text') {
    super('FormatGuardrail', 'Validates output format and structure');
    this.schema = schema;
    this.format = format; // 'text', 'json', 'markdown', 'code'
  }

  async validate(output) {
    const issues = [];

    if (this.format === 'json') {
      try {
        const parsed = JSON.parse(output);

        // Validate against schema if provided
        if (this.schema) {
          const schemaIssues = this.validateSchema(parsed, this.schema);
          issues.push(...schemaIssues);
        }
      } catch {
        issues.push('Invalid JSON format');
      }
    }

    if (this.format === 'markdown') {
      // Basic markdown validation
      const hasHeaders = /^#{1,6}\s/.test(output);
      if (!hasHeaders && output.length > 100) {
        issues.push('Markdown output should have headers for long content');
      }
    }

    if (this.format === 'code') {
      // Check for code blocks
      const hasCodeBlock = /```[\s\S]*```/.test(output);
      if (!hasCodeBlock && !output.includes('function') && !output.includes('const')) {
        issues.push('Expected code output but no code detected');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  validateSchema(obj, schema, path = '') {
    const issues = [];

    if (schema.required) {
      for (const field of schema.required) {
        if (obj[field] === undefined) {
          issues.push(`Missing required field: ${path}${field}`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (obj[key] !== undefined) {
          if (propSchema.type && typeof obj[key] !== propSchema.type) {
            issues.push(`Invalid type for ${path}${key}: expected ${propSchema.type}`);
          }
        }
      }
    }

    return issues;
  }
}

/**
 * Content Policy Guardrail - Checks for inappropriate content
 */
export class ContentPolicyGuardrail extends Guardrail {
  constructor(options = {}) {
    super('ContentPolicyGuardrail', 'Filters inappropriate or harmful content');
    this.blockedTerms = options.blockedTerms || [];
    this.blockedPatterns = options.blockedPatterns || [];
    this.categories = options.categories || ['hate', 'violence', 'sexual', 'self-harm'];
  }

  async validate(output) {
    const issues = [];
    const lowerOutput = output.toLowerCase();

    // Check blocked terms
    for (const term of this.blockedTerms) {
      if (lowerOutput.includes(term.toLowerCase())) {
        issues.push(`Contains blocked term: "${term}"`);
      }
    }

    // Check blocked patterns
    for (const pattern of this.blockedPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(output)) {
        issues.push(`Matches blocked pattern: ${pattern}`);
      }
    }

    // Check for common harmful patterns
    const harmfulPatterns = [
      { pattern: /how to (hack|break into|exploit)/i, category: 'security' },
      { pattern: /instructions for (weapons|explosives|drugs)/i, category: 'dangerous' },
      { pattern: /(kill|harm|hurt) (yourself|themselves)/i, category: 'self-harm' },
    ];

    for (const { pattern, category } of harmfulPatterns) {
      if (pattern.test(output)) {
        issues.push(`Potentially harmful content detected (${category})`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      severity: issues.length > 0 ? 'high' : 'none',
    };
  }

  // eslint-disable-next-line no-unused-vars
  async fix(output, _validationResult) {
    let fixed = output;

    // Redact blocked terms
    for (const term of this.blockedTerms) {
      const regex = new RegExp(term, 'gi');
      fixed = fixed.replace(regex, '[REDACTED]');
    }

    return fixed;
  }
}

/**
 * Factual Guardrail - Validates factual claims using AI
 */
export class FactualGuardrail extends Guardrail {
  constructor(provider = 'openai') {
    super('FactualGuardrail', 'Validates factual accuracy of claims');
    this.provider = provider;
    this.client = createAIClient(provider);
  }

  async validate(output, _context = {}) {
    const checkPrompt = `Analyze this text for factual accuracy. Identify any claims that are:
1. Clearly false
2. Misleading or out of context
3. Unverifiable or speculative
4. Outdated information

TEXT: ${output}

Respond with JSON: { "issues": [...], "confidenceScore": 0.0-1.0, "suggestions": [...] }`;

    const messages = [
      {
        role: 'system',
        content: 'You are a fact-checker. Be strict but fair. Respond with JSON only.',
      },
      { role: 'user', content: checkPrompt },
    ];

    const chatOptions = { temperature: 0.1 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    try {
      const response = await this.client.chat(messages, chatOptions);
      const result = JSON.parse(this.client.getTextContent(response));

      return {
        valid: (result.issues?.length || 0) === 0,
        issues: result.issues || [],
        confidenceScore: result.confidenceScore || 0.5,
        suggestions: result.suggestions || [],
      };
    } catch {
      return {
        valid: true, // Default to valid if check fails
        issues: [],
        error: 'Fact check failed',
      };
    }
  }
}

/**
 * Tone Guardrail - Validates appropriate tone
 */
export class ToneGuardrail extends Guardrail {
  constructor(options = {}) {
    super('ToneGuardrail', 'Validates appropriate tone and style');
    this.expectedTone = options.tone || 'professional'; // professional, casual, formal, friendly
    this.provider = options.provider || 'openai';
    this.client = createAIClient(this.provider);
  }

  async validate(output) {
    const checkPrompt = `Analyze the tone of this text. 

TEXT: ${output}

Expected tone: ${this.expectedTone}

Respond with JSON: { 
  "detectedTone": "...", 
  "matchesExpected": true/false, 
  "issues": [...], 
  "suggestions": [...]
}`;

    const messages = [
      { role: 'system', content: 'Analyze text tone. Respond with JSON only.' },
      { role: 'user', content: checkPrompt },
    ];

    const chatOptions = { temperature: 0.1 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    try {
      const response = await this.client.chat(messages, chatOptions);
      const result = JSON.parse(this.client.getTextContent(response));

      return {
        valid: result.matchesExpected !== false,
        issues: result.issues || [],
        detectedTone: result.detectedTone,
        suggestions: result.suggestions || [],
      };
    } catch {
      return { valid: true, issues: [], error: 'Tone check failed' };
    }
  }
}

/**
 * Consistency Guardrail - Validates consistency with context
 */
export class ConsistencyGuardrail extends Guardrail {
  constructor(provider = 'openai') {
    super('ConsistencyGuardrail', 'Validates consistency with provided context');
    this.provider = provider;
    this.client = createAIClient(provider);
  }

  async validate(output, context = {}) {
    if (!context.previousMessages && !context.facts) {
      return { valid: true, issues: [] };
    }

    const checkPrompt = `Check if this response is consistent with the context.

RESPONSE: ${output}

${context.previousMessages ? `CONVERSATION HISTORY:\n${JSON.stringify(context.previousMessages)}` : ''}
${context.facts ? `KNOWN FACTS:\n${JSON.stringify(context.facts)}` : ''}

Look for:
1. Contradictions with previous statements
2. Inconsistencies with known facts
3. Logical errors or non-sequiturs

Respond with JSON: { "consistent": true/false, "issues": [...], "contradictions": [...] }`;

    const messages = [
      { role: 'system', content: 'Check consistency. Respond with JSON only.' },
      { role: 'user', content: checkPrompt },
    ];

    const chatOptions = { temperature: 0.1 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    try {
      const response = await this.client.chat(messages, chatOptions);
      const result = JSON.parse(this.client.getTextContent(response));

      return {
        valid: result.consistent !== false,
        issues: result.issues || [],
        contradictions: result.contradictions || [],
      };
    } catch {
      return { valid: true, issues: [], error: 'Consistency check failed' };
    }
  }
}

/**
 * PII Guardrail - Detects and masks personally identifiable information
 */
export class PIIGuardrail extends Guardrail {
  constructor(options = {}) {
    super('PIIGuardrail', 'Detects and masks personally identifiable information');
    this.action = options.action || 'warn'; // 'warn', 'mask', 'block'
  }

  async validate(output) {
    const piiPatterns = [
      { name: 'email', pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/gi },
      { name: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
      { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
      { name: 'creditCard', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
      { name: 'ipAddress', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
    ];

    const detected = [];

    for (const { name, pattern } of piiPatterns) {
      const matches = output.match(pattern);
      if (matches) {
        detected.push({ type: name, count: matches.length, examples: matches.slice(0, 2) });
      }
    }

    return {
      valid: detected.length === 0,
      issues: detected.map((d) => `PII detected: ${d.type} (${d.count} instances)`),
      detected,
      action: this.action,
    };
  }

  async fix(output) {
    let fixed = output;

    const piiReplacements = [
      { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/gi, replacement: '[EMAIL]' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
    ];

    for (const { pattern, replacement } of piiReplacements) {
      fixed = fixed.replace(pattern, replacement);
    }

    return fixed;
  }
}

/**
 * GuardrailsEngine - Orchestrates multiple guardrails
 */
export class GuardrailsEngine {
  constructor(options = {}) {
    this.guardrails = [];
    this.verbose = options.verbose !== false;
    this.failFast = options.failFast || false;
    this.autoFix = options.autoFix || false;
  }

  /**
   * Add a guardrail to the engine
   */
  addGuardrail(guardrail) {
    this.guardrails.push(guardrail);
    return this;
  }

  /**
   * Validate output against all guardrails
   */
  async validate(output, context = {}) {
    const results = [];
    let currentOutput = output;
    let allValid = true;

    for (const guardrail of this.guardrails) {
      if (!guardrail.enabled) continue;

      if (this.verbose) {
        console.log(`   🔍 Running: ${guardrail.name}`);
      }

      const result = await guardrail.validate(currentOutput, context);
      results.push({
        guardrail: guardrail.name,
        ...result,
      });

      if (!result.valid) {
        allValid = false;

        if (this.verbose) {
          console.log(`      ❌ Failed: ${result.issues?.join(', ')}`);
        }

        // Attempt auto-fix if enabled
        if (this.autoFix) {
          currentOutput = await guardrail.fix(currentOutput, result);
          if (this.verbose) {
            console.log(`      🔧 Auto-fix applied`);
          }
        }

        if (this.failFast) {
          break;
        }
      } else if (this.verbose) {
        console.log(`      ✅ Passed`);
      }
    }

    return {
      valid: allValid,
      output: currentOutput,
      originalOutput: output,
      wasFixed: currentOutput !== output,
      results,
    };
  }

  /**
   * Create a pre-configured engine for common use cases
   */
  static createDefault(_provider = 'openai') {
    const engine = new GuardrailsEngine({ verbose: true, autoFix: true });

    engine
      .addGuardrail(new LengthGuardrail({ minLength: 10, maxLength: 5000 }))
      .addGuardrail(new ContentPolicyGuardrail())
      .addGuardrail(new PIIGuardrail({ action: 'mask' }));

    return engine;
  }

  static createStrict(provider = 'openai') {
    const engine = new GuardrailsEngine({ verbose: true, failFast: true });

    engine
      .addGuardrail(new LengthGuardrail({ minLength: 50, maxLength: 3000 }))
      .addGuardrail(new ContentPolicyGuardrail())
      .addGuardrail(new PIIGuardrail({ action: 'block' }))
      .addGuardrail(new FactualGuardrail(provider))
      .addGuardrail(new ToneGuardrail({ tone: 'professional', provider }));

    return engine;
  }
}

/**
 * Guarded AI Client - Wraps an AI client with guardrails
 */
export class GuardedAIClient {
  constructor(provider = 'openai', guardrailsEngine = null) {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.guardrails = guardrailsEngine || GuardrailsEngine.createDefault(provider);
  }

  /**
   * Chat with guardrails applied to output
   */
  async chat(messages, options = {}) {
    const response = await this.client.chat(messages, options);
    const output = this.client.getTextContent(response);

    const validation = await this.guardrails.validate(output, {
      previousMessages: messages,
    });

    return {
      originalResponse: output,
      validatedResponse: validation.output,
      validation,
      response,
    };
  }
}
