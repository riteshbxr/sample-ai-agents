import { createAIClient } from '../../../clients/client-factory.js';

/**
 * Self-Reflection Agent
 * An agent that critiques and improves its own output through iterative self-reflection.
 *
 * Key Concepts:
 * - Generation: Initial response to the user's request
 * - Critique: Self-evaluation of the generated response
 * - Revision: Improved response based on the critique
 * - Iteration: Repeat until quality threshold is met
 *
 * This pattern is used in:
 * - Constitutional AI
 * - Self-Refine paper (Madaan et al., 2023)
 * - Reflexion (Shinn et al., 2023)
 */
export class SelfReflectionAgent {
  /**
   * Create a self-reflection agent
   * @param {string} provider - AI provider ('openai' or 'claude')
   * @param {Object} options - Configuration options
   * @param {number} options.maxIterations - Maximum reflection iterations (default: 3)
   * @param {number} options.qualityThreshold - Quality score threshold to stop (default: 0.8)
   * @param {boolean} options.verbose - Enable detailed logging (default: true)
   */
  constructor(provider = 'openai', options = {}) {
    this.provider = provider;
    this.client = createAIClient(provider);
    this.maxIterations = options.maxIterations || 3;
    this.qualityThreshold = options.qualityThreshold || 0.8;
    this.verbose = options.verbose !== false;
    this.reflectionHistory = [];
  }

  /**
   * Generate initial response
   * @param {string} task - The task/prompt to complete
   * @param {string} systemPrompt - Optional system prompt
   * @returns {Promise<string>} Initial response
   */
  async generate(task, systemPrompt = null) {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: task });

    const response = await this.client.chat(messages, { temperature: 0.7 });
    return this.client.getTextContent(response);
  }

  /**
   * Self-critique the generated response
   * @param {string} task - Original task
   * @param {string} response - Response to critique
   * @returns {Promise<Object>} Critique with score and feedback
   */
  async critique(task, response) {
    const critiquePrompt = `You are a critical evaluator. Analyze the following response to a task.

TASK: ${task}

RESPONSE: ${response}

Evaluate the response on these criteria:
1. Accuracy - Is the information correct?
2. Completeness - Does it fully address the task?
3. Clarity - Is it well-written and easy to understand?
4. Relevance - Does it stay on topic?
5. Quality - Overall quality of the response

For each criterion, provide:
- A score from 0.0 to 1.0
- Brief feedback on what could be improved

IMPORTANT: Respond in this exact JSON format:
{
  "accuracy": { "score": 0.0, "feedback": "..." },
  "completeness": { "score": 0.0, "feedback": "..." },
  "clarity": { "score": 0.0, "feedback": "..." },
  "relevance": { "score": 0.0, "feedback": "..." },
  "quality": { "score": 0.0, "feedback": "..." },
  "overallScore": 0.0,
  "mainIssues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    const messages = [
      {
        role: 'system',
        content: 'You are a critical evaluator. Always respond with valid JSON only, no markdown.',
      },
      { role: 'user', content: critiquePrompt },
    ];

    const chatOptions = { temperature: 0.3 };

    // Only add response_format for OpenAI providers
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const critiqueResponse = await this.client.chat(messages, chatOptions);
    const critiqueText = this.client.getTextContent(critiqueResponse);

    try {
      return JSON.parse(critiqueText);
    } catch {
      // Fallback if JSON parsing fails
      return {
        accuracy: { score: 0.7, feedback: 'Unable to parse detailed critique' },
        completeness: { score: 0.7, feedback: '' },
        clarity: { score: 0.7, feedback: '' },
        relevance: { score: 0.7, feedback: '' },
        quality: { score: 0.7, feedback: '' },
        overallScore: 0.7,
        mainIssues: ['Could not parse critique'],
        suggestions: ['Continue with revision'],
      };
    }
  }

  /**
   * Revise the response based on critique
   * @param {string} task - Original task
   * @param {string} response - Original response
   * @param {Object} critique - Critique feedback
   * @returns {Promise<string>} Revised response
   */
  async revise(task, response, critique) {
    const revisionPrompt = `You are tasked with improving a response based on feedback.

ORIGINAL TASK: ${task}

ORIGINAL RESPONSE: ${response}

CRITIQUE FEEDBACK:
- Overall Score: ${critique.overallScore}
- Main Issues: ${critique.mainIssues?.join(', ') || 'None specified'}
- Suggestions: ${critique.suggestions?.join(', ') || 'None specified'}

Detailed Feedback:
${Object.entries(critique)
  .filter(([key]) => ['accuracy', 'completeness', 'clarity', 'relevance', 'quality'].includes(key))
  .map(([key, val]) => `- ${key}: ${val.score} - ${val.feedback}`)
  .join('\n')}

Please provide an improved response that addresses the feedback while maintaining what was good about the original. Focus especially on the main issues mentioned.`;

    const messages = [
      {
        role: 'system',
        content: 'You are a skilled writer who excels at improving content based on feedback.',
      },
      { role: 'user', content: revisionPrompt },
    ];

    const revisedResponse = await this.client.chat(messages, { temperature: 0.5 });
    return this.client.getTextContent(revisedResponse);
  }

  /**
   * Run the full self-reflection loop
   * @param {string} task - The task to complete
   * @param {string} systemPrompt - Optional system prompt for generation
   * @returns {Promise<Object>} Final result with history
   */
  async reflect(task, systemPrompt = null) {
    if (this.verbose) {
      console.log('\n🔄 Starting Self-Reflection Loop');
      console.log('='.repeat(60));
      console.log(`📝 Task: ${task}`);
      console.log(`⚙️  Max iterations: ${this.maxIterations}`);
      console.log(`🎯 Quality threshold: ${this.qualityThreshold}`);
    }

    this.reflectionHistory = [];
    let currentResponse = await this.generate(task, systemPrompt);
    let iteration = 0;

    if (this.verbose) {
      console.log(`\n📄 Initial Response (iteration 0):`);
      console.log(`   ${currentResponse.substring(0, 200)}...`);
    }

    while (iteration < this.maxIterations) {
      iteration++;

      if (this.verbose) {
        console.log(`\n--- Iteration ${iteration} ---`);
      }

      // Critique the current response
      const critique = await this.critique(task, currentResponse);

      if (this.verbose) {
        console.log(`\n🔍 Critique:`);
        console.log(`   Overall Score: ${(critique.overallScore * 100).toFixed(1)}%`);
        console.log(`   Main Issues: ${critique.mainIssues?.join(', ') || 'None'}`);
      }

      // Store in history
      this.reflectionHistory.push({
        iteration,
        response: currentResponse,
        critique,
      });

      // Check if quality threshold is met
      if (critique.overallScore >= this.qualityThreshold) {
        if (this.verbose) {
          console.log(
            `\n✅ Quality threshold met (${critique.overallScore} >= ${this.qualityThreshold})`
          );
        }
        break;
      }

      // Revise based on critique
      if (this.verbose) {
        console.log(`\n✏️  Revising response...`);
      }

      currentResponse = await this.revise(task, currentResponse, critique);

      if (this.verbose) {
        console.log(`   Revised: ${currentResponse.substring(0, 200)}...`);
      }
    }

    // Final critique
    const finalCritique = await this.critique(task, currentResponse);

    return {
      task,
      finalResponse: currentResponse,
      finalScore: finalCritique.overallScore,
      iterations: iteration,
      history: this.reflectionHistory,
      finalCritique,
    };
  }

  /**
   * Get reflection statistics
   */
  getStats() {
    if (this.reflectionHistory.length === 0) {
      return null;
    }

    const scores = this.reflectionHistory.map((h) => h.critique.overallScore);
    return {
      totalIterations: this.reflectionHistory.length,
      scoreImprovement: scores[scores.length - 1] - scores[0],
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      scoreProgression: scores,
    };
  }
}

/**
 * Specialized Self-Reflection for Code
 * Extends the base agent with code-specific critique criteria
 */
export class CodeReflectionAgent extends SelfReflectionAgent {
  /**
   * Code-specific critique
   */
  async critique(task, code) {
    const critiquePrompt = `You are an expert code reviewer. Analyze the following code.

TASK: ${task}

CODE:
\`\`\`
${code}
\`\`\`

Evaluate the code on these criteria:
1. Correctness - Does it solve the problem correctly?
2. Efficiency - Is it well-optimized?
3. Readability - Is it clean and well-documented?
4. Best Practices - Does it follow coding standards?
5. Error Handling - Does it handle edge cases?

IMPORTANT: Respond in this exact JSON format:
{
  "correctness": { "score": 0.0, "feedback": "..." },
  "efficiency": { "score": 0.0, "feedback": "..." },
  "readability": { "score": 0.0, "feedback": "..." },
  "bestPractices": { "score": 0.0, "feedback": "..." },
  "errorHandling": { "score": 0.0, "feedback": "..." },
  "overallScore": 0.0,
  "mainIssues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    const messages = [
      {
        role: 'system',
        content: 'You are an expert code reviewer. Always respond with valid JSON only.',
      },
      { role: 'user', content: critiquePrompt },
    ];

    const chatOptions = { temperature: 0.2 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat(messages, chatOptions);
    const text = this.client.getTextContent(response);

    try {
      return JSON.parse(text);
    } catch {
      return {
        correctness: { score: 0.7, feedback: 'Unable to parse' },
        efficiency: { score: 0.7, feedback: '' },
        readability: { score: 0.7, feedback: '' },
        bestPractices: { score: 0.7, feedback: '' },
        errorHandling: { score: 0.7, feedback: '' },
        overallScore: 0.7,
        mainIssues: ['Could not parse critique'],
        suggestions: [],
      };
    }
  }
}

/**
 * Chain-of-Verification Agent
 * Verifies claims made in the response
 */
export class VerificationAgent extends SelfReflectionAgent {
  /**
   * Extract and verify claims in the response
   */
  async verify(task, response) {
    // Step 1: Extract claims
    const extractPrompt = `Extract all factual claims from this text. Return as JSON array of strings.

TEXT: ${response}

Respond with JSON only: { "claims": ["claim1", "claim2", ...] }`;

    const extractMessages = [
      { role: 'system', content: 'Extract claims. Respond with JSON only.' },
      { role: 'user', content: extractPrompt },
    ];

    const chatOptions = { temperature: 0.1 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    const extractResponse = await this.client.chat(extractMessages, chatOptions);
    let claims = [];

    try {
      const parsed = JSON.parse(this.client.getTextContent(extractResponse));
      claims = parsed.claims || [];
    } catch {
      claims = [];
    }

    if (this.verbose) {
      console.log(`\n🔍 Extracted ${claims.length} claims to verify`);
    }

    // Step 2: Verify each claim
    const verifiedClaims = [];
    for (const claim of claims.slice(0, 5)) {
      // Limit to 5 claims
      const verifyPrompt = `Verify if this claim is accurate: "${claim}"

Consider:
1. Is this factually correct?
2. Is it verifiable?
3. Are there any caveats or nuances?

Respond with JSON: { "claim": "...", "isVerified": true/false, "confidence": 0.0-1.0, "reasoning": "..." }`;

      const verifyMessages = [
        { role: 'system', content: 'Verify claims. Respond with JSON only.' },
        { role: 'user', content: verifyPrompt },
      ];

      const verifyResponse = await this.client.chat(verifyMessages, chatOptions);

      try {
        const verified = JSON.parse(this.client.getTextContent(verifyResponse));
        verifiedClaims.push(verified);
      } catch {
        verifiedClaims.push({
          claim,
          isVerified: false,
          confidence: 0,
          reasoning: 'Could not verify',
        });
      }
    }

    return {
      originalResponse: response,
      claims: verifiedClaims,
      verificationRate:
        verifiedClaims.filter((c) => c.isVerified).length / verifiedClaims.length || 0,
    };
  }

  /**
   * Full reflection with verification
   */
  async reflectWithVerification(task, systemPrompt = null) {
    const result = await this.reflect(task, systemPrompt);

    if (this.verbose) {
      console.log('\n🔎 Running Chain-of-Verification...');
    }

    const verification = await this.verify(task, result.finalResponse);

    return {
      ...result,
      verification,
    };
  }
}
