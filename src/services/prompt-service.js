import { createAIClient } from '../clients/client-factory.js';
import { providerUtils } from '../config.js';

/**
 * Prompt Engineering Service
 * Provides utilities for various prompt engineering techniques
 */
export class PromptService {
  constructor(provider = null) {
    this.provider = provider || providerUtils.getDefaultProvider();
    this.client = createAIClient(this.provider);
  }

  /**
   * Few-shot learning prompt
   * @param {Array<Object>} examples - Array of {input, output} examples
   * @param {string} input - Input to classify/predict
   * @param {string} taskDescription - Description of the task
   * @returns {string} Formatted few-shot prompt
   */
  createFewShotPrompt(examples, input, taskDescription = '') {
    let prompt = taskDescription ? `${taskDescription}\n\n` : '';

    examples.forEach((example) => {
      prompt += `Input: ${example.input}\nOutput: ${example.output}\n\n`;
    });

    prompt += `Input: ${input}\nOutput:`;
    return prompt;
  }

  /**
   * Chain-of-thought prompt
   * @param {string} problem - Problem to solve
   * @param {string|Array<string>} steps - Optional step hints or instruction
   * @returns {string} CoT prompt
   */
  createChainOfThoughtPrompt(problem, steps = '') {
    let prompt = `Solve this step by step:\n\nProblem: ${problem}\n\n`;

    // Handle steps as array or string
    const stepsArray = Array.isArray(steps) ? steps : steps ? [steps] : [];

    if (stepsArray.length > 0) {
      prompt += "Let's think step by step:\n";
      stepsArray.forEach((step, i) => {
        prompt += `${i + 1}. ${step}\n`;
      });
    } else {
      prompt += "Let's think step by step:\n";
    }

    return prompt;
  }

  /**
   * Role-playing prompt
   * @param {string} role - Role description
   * @param {string} question - Question to answer
   * @returns {string} Role-playing prompt
   */
  createRolePlayingPrompt(role, question) {
    return `You are ${role}\n\n${question}`;
  }

  /**
   * Create role-based prompt (alias for createRolePlayingPrompt with additional context)
   * @param {string} role - Role description
   * @param {string} task - Task to perform
   * @param {string} audience - Target audience
   * @returns {string} Role-based prompt
   */
  createRoleBasedPrompt(role, task, audience = '') {
    let prompt = `You are ${role}\n\n${task}`;
    if (audience) {
      prompt += ` ${audience}`;
    }
    return prompt;
  }

  /**
   * Output formatting prompt
   * @param {string} task - Task description
   * @param {string|Object} format - Format specification
   * @returns {string} Formatted prompt
   */
  createFormattingPrompt(task, format) {
    const formatStr = typeof format === 'string' ? format : JSON.stringify(format, null, 2);
    return `${task}\n\nFormat the output as:\n${formatStr}`;
  }

  /**
   * Constrained generation prompt
   * @param {string} task - Task description
   * @param {Object} constraints - Constraints object
   * @returns {string} Constrained prompt
   */
  createConstrainedPrompt(task, constraints) {
    let prompt = `${task}\n\n`;

    if (constraints.do) {
      prompt += 'DO:\n';
      if (Array.isArray(constraints.do)) {
        constraints.do.forEach((item) => {
          prompt += `- ${item}\n`;
        });
      } else {
        prompt += `- ${constraints.do}\n`;
      }
    }

    if (constraints.doNot) {
      prompt += '\nDO NOT:\n';
      if (Array.isArray(constraints.doNot)) {
        constraints.doNot.forEach((item) => {
          prompt += `- ${item}\n`;
        });
      } else {
        prompt += `- ${constraints.doNot}\n`;
      }
    }

    return prompt;
  }

  /**
   * Execute few-shot learning
   * @param {Array<Object>} examples - Training examples
   * @param {string} input - Input to classify
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Classification result
   */
  async fewShotLearning(examples, input, options = {}) {
    const prompt = this.createFewShotPrompt(examples, input, options.taskDescription);
    const response = await this.client.chat([{ role: 'user', content: prompt }], {
      temperature: options.temperature || 0,
      ...options,
    });
    return this.client.getTextContent(response);
  }

  /**
   * Execute chain-of-thought reasoning
   * @param {string} problem - Problem to solve
   * @param {string|Array<string>} steps - Optional step hints or instruction
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Reasoning result
   */
  async chainOfThought(problem, steps = '', options = {}) {
    const prompt = this.createChainOfThoughtPrompt(problem, steps);
    const response = await this.client.chat([{ role: 'user', content: prompt }], {
      temperature: options.temperature || 0.3,
      ...options,
    });
    return this.client.getTextContent(response);
  }

  /**
   * Execute role-playing
   * @param {string} role - Role description
   * @param {string} question - Question to answer
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Response
   */
  async rolePlaying(role, question, options = {}) {
    const prompt = this.createRolePlayingPrompt(role, question);
    const response = await this.client.chat([{ role: 'user', content: prompt }], {
      temperature: options.temperature || 0.7,
      ...options,
    });
    return this.client.getTextContent(response);
  }

  /**
   * Execute prompt chaining (multiple sequential prompts)
   * @param {Array<Object>} chain - Array of {prompt, options} objects
   * @returns {Promise<Array>} Results from each step
   */
  async promptChain(chain) {
    const results = [];
    let context = '';

    for (const step of chain) {
      const prompt = context
        ? `${step.prompt}\n\nContext from previous steps:\n${context}`
        : step.prompt;
      const response = await this.client.chat(
        [{ role: 'user', content: prompt }],
        step.options || {}
      );
      const result = this.client.getTextContent(response);
      results.push(result);
      context += `${result}\n\n`;
    }

    return results;
  }

  /**
   * Self-consistency: Generate multiple responses and find common themes
   * @param {string} prompt - Prompt to generate responses for
   * @param {number|Object} numResponsesOrOptions - Number of responses or options object
   * @param {Object} options - Additional options (if numResponsesOrOptions is a number)
   * @returns {Promise<Object>} Object with mostCommonAnswer, allAnswers, votes, and confidence
   */
  async selfConsistency(prompt, numResponsesOrOptions = 3, options = {}) {
    // Handle both (prompt, numResponses, options) and (prompt, options) signatures
    let numResponses = 3;
    let opts = options;

    if (typeof numResponsesOrOptions === 'object' && numResponsesOrOptions !== null) {
      opts = numResponsesOrOptions;
      numResponses = opts.samples || opts.numResponses || 3;
    } else if (typeof numResponsesOrOptions === 'number') {
      numResponses = numResponsesOrOptions;
      opts = options;
    }

    const responses = [];

    for (let i = 0; i < numResponses; i++) {
      const response = await this.client.chat([{ role: 'user', content: prompt }], {
        temperature: opts.temperature || 0.7,
        ...opts,
      });
      responses.push(this.client.getTextContent(response));
    }

    // Extract answers and count votes
    const votes = {};
    const allAnswers = responses.map((r) => this._extractAnswer(r));

    allAnswers.forEach((answer) => {
      votes[answer] = (votes[answer] || 0) + 1;
    });

    // Find most common answer
    let mostCommonAnswer = null;
    let maxVotes = 0;
    for (const [answer, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        mostCommonAnswer = answer;
      }
    }

    const confidence = maxVotes / numResponses;

    return {
      mostCommonAnswer,
      allAnswers,
      votes,
      confidence,
    };
  }

  /**
   * Extract answer from response text
   * @private
   * @param {string} response - Response text
   * @returns {string} Extracted answer
   */
  _extractAnswer(response) {
    // Try to extract answer after "Answer:" or "The answer is"
    // Match "Answer:" (with colon) or "The answer is" (complete phrase)
    // Use word boundaries to ensure we match complete phrases, not "answer" as part of another word
    const patterns = [
      /(?:^|\s)Answer:\s*(.+?)(?:\.|$|\n)/i, // Match "Answer:" with colon
      /(?:^|\s)The answer is\s+(.+?)(?:\.|$|\n)/i, // Match "The answer is" as complete phrase
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no pattern found, return the response as-is
    return response.trim();
  }

  /**
   * Create meta-prompting prompt
   * @param {string} task - Task description
   * @returns {string} Meta-prompting prompt
   */
  createMetaPromptingPrompt(task) {
    return `You are an expert in this field. Consider this task from multiple perspectives:\n\nTask: ${task}\n\nThink about this from different angles and provide a comprehensive response.`;
  }

  /**
   * Create structured output prompt
   * @param {string} task - Task description
   * @param {Object} schema - Schema object describing the structure
   * @returns {string} Structured output prompt
   */
  createStructuredOutputPrompt(task, schema) {
    const schemaStr = JSON.stringify(schema, null, 2);
    return `${task}\n\nReturn the result as a JSON object matching this schema:\n${schemaStr}\n\nEnsure the output is valid JSON.`;
  }

  /**
   * Extract structured data from text
   * @param {string} text - Text to extract data from
   * @param {Object} schema - Schema object describing the expected structure
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Extracted structured data
   */
  async extractStructuredData(text, schema, options = {}) {
    const prompt = this.createStructuredOutputPrompt(
      `Extract information from the following text: ${text}`,
      schema
    );

    const response = await this.client.chat([{ role: 'user', content: prompt }], {
      temperature: options.temperature || 0,
      response_format: { type: 'json_object' },
      ...options,
    });

    const content = this.client.getTextContent(response);

    try {
      return JSON.parse(content);
    } catch (error) {
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error(`Failed to parse structured data: ${error.message}`);
    }
  }
}
