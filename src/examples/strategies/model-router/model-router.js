import { createAIClient } from '../../../clients/client-factory.js';

/**
 * Smart Model Router
 * Intelligently routes requests to appropriate models based on task requirements.
 *
 * Key Concepts:
 * - Task Analysis: Understand what the task requires
 * - Model Capabilities: Know what each model can do
 * - Cost Optimization: Use cheaper models when appropriate
 * - Quality Assurance: Use better models for complex tasks
 * - Fallback Handling: Gracefully handle model failures
 *
 * Based on:
 * - Model routing patterns in production AI systems
 * - Cost-aware inference strategies
 * - Capability-based routing
 */

/**
 * Model definition with capabilities
 */
class ModelDefinition {
  constructor(config) {
    this.id = config.id;
    this.provider = config.provider;
    this.name = config.name;
    this.capabilities = config.capabilities || [];
    this.maxTokens = config.maxTokens || 4096;
    this.costPer1kTokens = config.costPer1kTokens || { input: 0, output: 0 };
    this.speedRating = config.speedRating || 5; // 1-10, 10 = fastest
    this.qualityRating = config.qualityRating || 5; // 1-10, 10 = best
    this.enabled = config.enabled !== false;
  }

  /**
   * Calculate estimated cost for a request
   */
  estimateCost(inputTokens, outputTokens) {
    return (
      (inputTokens / 1000) * this.costPer1kTokens.input +
      (outputTokens / 1000) * this.costPer1kTokens.output
    );
  }

  /**
   * Check if model has a capability
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability);
  }
}

/**
 * Task classifier - analyzes tasks to determine requirements
 */
class TaskClassifier {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.client = createAIClient(provider);
  }

  /**
   * Classify a task's requirements
   */
  async classify(task) {
    const classifyPrompt = `Analyze this task and determine its requirements.

TASK: ${task}

Classify the task on these dimensions:
1. Complexity: simple (can be done with basic reasoning) / moderate / complex (requires advanced reasoning)
2. Length: short (few sentences) / medium / long (detailed response)
3. Creativity: factual / balanced / creative
4. Specialization: general / code / math / analysis / writing / other
5. Urgency: how quickly is a response needed (fast/normal/can be slow)

Respond with JSON:
{
  "complexity": "simple" | "moderate" | "complex",
  "expectedLength": "short" | "medium" | "long",
  "creativity": "factual" | "balanced" | "creative",
  "specialization": "general" | "code" | "math" | "analysis" | "writing",
  "estimatedInputTokens": 100,
  "estimatedOutputTokens": 200,
  "requiresReasoning": true/false,
  "requiresKnowledge": true/false,
  "confidence": 0.0-1.0
}`;

    const messages = [
      { role: 'system', content: 'Classify tasks accurately. Respond with JSON only.' },
      { role: 'user', content: classifyPrompt },
    ];

    const chatOptions = { temperature: 0.1 };
    if (this.provider !== 'claude') {
      chatOptions.response_format = { type: 'json_object' };
    }

    try {
      const response = await this.client.chat(messages, chatOptions);
      return JSON.parse(this.client.getTextContent(response));
    } catch {
      // Default classification
      return {
        complexity: 'moderate',
        expectedLength: 'medium',
        creativity: 'balanced',
        specialization: 'general',
        estimatedInputTokens: 150,
        estimatedOutputTokens: 500,
        requiresReasoning: true,
        requiresKnowledge: true,
        confidence: 0.5,
      };
    }
  }

  /**
   * Quick classification using heuristics (no API call)
   */
  quickClassify(task) {
    const taskLower = task.toLowerCase();
    const wordCount = task.split(/\s+/).length;

    // Determine complexity from keywords and length
    let complexity = 'moderate';
    if (
      taskLower.includes('explain in detail') ||
      taskLower.includes('comprehensive') ||
      taskLower.includes('analyze') ||
      wordCount > 50
    ) {
      complexity = 'complex';
    } else if (taskLower.includes('simple') || taskLower.includes('quick') || wordCount < 10) {
      complexity = 'simple';
    }

    // Determine specialization
    let specialization = 'general';
    if (
      taskLower.includes('code') ||
      taskLower.includes('function') ||
      taskLower.includes('programming')
    ) {
      specialization = 'code';
    } else if (
      taskLower.includes('calculate') ||
      taskLower.includes('math') ||
      taskLower.includes('equation')
    ) {
      specialization = 'math';
    } else if (
      taskLower.includes('write') ||
      taskLower.includes('essay') ||
      taskLower.includes('story')
    ) {
      specialization = 'writing';
    }

    return {
      complexity,
      specialization,
      estimatedInputTokens: wordCount * 1.5,
      estimatedOutputTokens: complexity === 'complex' ? 1000 : complexity === 'simple' ? 200 : 500,
    };
  }
}

/**
 * Smart Model Router
 */
export class ModelRouter {
  constructor(options = {}) {
    this.models = new Map();
    this.classifier = new TaskClassifier(options.classifierProvider || 'openai');
    this.verbose = options.verbose !== false;
    this.routingHistory = [];
    this.costSavings = 0;

    // Routing strategy
    this.strategy = options.strategy || 'balanced'; // cost, quality, balanced, speed

    // Initialize with default models if none provided
    if (options.models) {
      for (const model of options.models) {
        this.registerModel(model);
      }
    } else {
      this.initializeDefaultModels();
    }
  }

  /**
   * Initialize default model definitions
   */
  initializeDefaultModels() {
    // GPT-4 class
    this.registerModel(
      new ModelDefinition({
        id: 'gpt-4',
        provider: 'openai',
        name: 'GPT-4',
        capabilities: ['reasoning', 'code', 'analysis', 'writing', 'math', 'complex'],
        maxTokens: 8192,
        costPer1kTokens: { input: 0.03, output: 0.06 },
        speedRating: 6,
        qualityRating: 9,
      })
    );

    // GPT-3.5 class
    this.registerModel(
      new ModelDefinition({
        id: 'gpt-3.5-turbo',
        provider: 'openai',
        name: 'GPT-3.5 Turbo',
        capabilities: ['general', 'code', 'writing', 'simple', 'fast'],
        maxTokens: 4096,
        costPer1kTokens: { input: 0.0005, output: 0.0015 },
        speedRating: 9,
        qualityRating: 7,
      })
    );

    // Claude Sonnet
    this.registerModel(
      new ModelDefinition({
        id: 'claude-sonnet',
        provider: 'claude',
        name: 'Claude Sonnet',
        capabilities: [
          'reasoning',
          'code',
          'analysis',
          'writing',
          'math',
          'complex',
          'long-context',
        ],
        maxTokens: 8192,
        costPer1kTokens: { input: 0.003, output: 0.015 },
        speedRating: 7,
        qualityRating: 9,
      })
    );

    // Mock fast model
    this.registerModel(
      new ModelDefinition({
        id: 'fast-model',
        provider: 'mock',
        name: 'Fast Model (Mock)',
        capabilities: ['general', 'simple', 'fast'],
        maxTokens: 2048,
        costPer1kTokens: { input: 0.0001, output: 0.0002 },
        speedRating: 10,
        qualityRating: 5,
      })
    );
  }

  /**
   * Register a model
   */
  registerModel(model) {
    this.models.set(model.id, model);
    if (this.verbose) {
      console.log(`📝 Registered model: ${model.name} (${model.id})`);
    }
  }

  /**
   * Select the best model for a task
   */
  async selectModel(task, options = {}) {
    // Classify the task
    const classification = options.skipClassification
      ? this.classifier.quickClassify(task)
      : await this.classifier.classify(task);

    if (this.verbose) {
      console.log(`\n📊 Task classification:`);
      console.log(`   Complexity: ${classification.complexity}`);
      console.log(`   Specialization: ${classification.specialization}`);
    }

    // Filter enabled models
    const availableModels = Array.from(this.models.values()).filter((m) => m.enabled);

    // Score each model
    const scoredModels = availableModels.map((model) => {
      let score = 0;

      // Capability matching
      if (classification.complexity === 'complex' && model.hasCapability('complex')) {
        score += 30;
      } else if (classification.complexity === 'simple' && model.hasCapability('simple')) {
        score += 20;
      }

      if (model.hasCapability(classification.specialization)) {
        score += 25;
      }

      if (classification.requiresReasoning && model.hasCapability('reasoning')) {
        score += 20;
      }

      // Strategy-based scoring
      switch (this.strategy) {
        case 'cost':
          score += (1 - model.costPer1kTokens.output / 0.1) * 25;
          break;
        case 'quality':
          score += model.qualityRating * 2.5;
          break;
        case 'speed':
          score += model.speedRating * 2.5;
          break;
        case 'balanced':
        default:
          score += model.qualityRating * 1.5;
          score += model.speedRating;
          score += (1 - model.costPer1kTokens.output / 0.1) * 15;
          break;
      }

      return { model, score, classification };
    });

    // Sort by score
    scoredModels.sort((a, b) => b.score - a.score);

    const selected = scoredModels[0];

    // Calculate potential cost savings
    const expensiveModel = scoredModels.find((m) => m.model.qualityRating >= 9);
    if (expensiveModel && selected.model !== expensiveModel.model) {
      const _expectedTokens =
        classification.estimatedInputTokens + classification.estimatedOutputTokens;
      const expensiveCost = expensiveModel.model.estimateCost(
        classification.estimatedInputTokens,
        classification.estimatedOutputTokens
      );
      const selectedCost = selected.model.estimateCost(
        classification.estimatedInputTokens,
        classification.estimatedOutputTokens
      );
      this.costSavings += expensiveCost - selectedCost;
    }

    // Record routing decision
    this.routingHistory.push({
      task: task.substring(0, 100),
      selectedModel: selected.model.id,
      classification,
      score: selected.score,
      timestamp: new Date().toISOString(),
    });

    if (this.verbose) {
      console.log(`\n🎯 Selected model: ${selected.model.name}`);
      console.log(`   Score: ${selected.score.toFixed(1)}`);
      console.log(
        `   Est. cost: $${selected.model.estimateCost(classification.estimatedInputTokens, classification.estimatedOutputTokens).toFixed(5)}`
      );
    }

    return {
      model: selected.model,
      classification,
      score: selected.score,
      alternatives: scoredModels.slice(1, 3).map((m) => ({
        model: m.model.id,
        score: m.score,
      })),
    };
  }

  /**
   * Route a request to the appropriate model and get a response
   */
  async route(task, options = {}) {
    const selection = await this.selectModel(task, options);

    // Create client for selected model's provider
    let client;
    try {
      if (selection.model.provider === 'mock') {
        // Mock response for demonstration
        return {
          response: `[Mock response from ${selection.model.name}] This is a simulated response to: ${task.substring(0, 50)}...`,
          modelUsed: selection.model.id,
          selection,
        };
      }

      client = createAIClient(selection.model.provider);
    } catch (error) {
      // Fallback to default provider
      if (this.verbose) {
        console.log(`   ⚠️ Falling back to default provider`);
      }
      client = createAIClient('openai');
    }

    // Make the request
    const messages = [{ role: 'user', content: task }];
    const response = await client.chat(messages, options.chatOptions || {});
    const text = client.getTextContent(response);

    return {
      response: text,
      modelUsed: selection.model.id,
      selection,
    };
  }

  /**
   * Get routing statistics
   */
  getStats() {
    const modelUsage = {};
    for (const record of this.routingHistory) {
      modelUsage[record.selectedModel] = (modelUsage[record.selectedModel] || 0) + 1;
    }

    return {
      totalRequests: this.routingHistory.length,
      modelUsage,
      estimatedCostSavings: this.costSavings.toFixed(4),
      strategy: this.strategy,
    };
  }

  /**
   * Set routing strategy
   */
  setStrategy(strategy) {
    this.strategy = strategy;
    if (this.verbose) {
      console.log(`📐 Strategy set to: ${strategy}`);
    }
  }
}

/**
 * Cascading Router - tries models in order of preference
 */
export class CascadingRouter {
  constructor(models, options = {}) {
    this.models = models; // Array of { provider, qualityThreshold }
    this.verbose = options.verbose !== false;
  }

  /**
   * Try models in cascade until one succeeds with acceptable quality
   */
  async route(task, _options = {}) {
    for (let i = 0; i < this.models.length; i++) {
      const modelConfig = this.models[i];
      const isLastModel = i === this.models.length - 1;

      if (this.verbose) {
        console.log(`\n🔄 Trying model ${i + 1}: ${modelConfig.provider}`);
      }

      try {
        const client = createAIClient(modelConfig.provider);
        const response = await client.chat([{ role: 'user', content: task }]);
        const text = client.getTextContent(response);

        // Check quality (simple length check for demo)
        const qualityOk = text.length > 50 || isLastModel;

        if (qualityOk) {
          return {
            response: text,
            modelUsed: modelConfig.provider,
            attemptNumber: i + 1,
          };
        }

        if (this.verbose) {
          console.log(`   ⚠️ Quality below threshold, trying next model`);
        }
      } catch (error) {
        if (this.verbose) {
          console.log(`   ❌ Model failed: ${error.message}`);
        }
        if (isLastModel) {
          throw error;
        }
      }
    }
  }
}

/**
 * Load Balancer - distributes requests across models
 */
export class LoadBalancer {
  constructor(models, options = {}) {
    this.models = models; // Array of provider names
    this.currentIndex = 0;
    this.requestCounts = {};
    this.verbose = options.verbose !== false;
    this.strategy = options.strategy || 'round-robin'; // round-robin, least-loaded, random
  }

  /**
   * Select next model based on strategy
   */
  selectModel() {
    let selected;

    switch (this.strategy) {
      case 'least-loaded': {
        const counts = this.models.map((m) => ({
          model: m,
          count: this.requestCounts[m] || 0,
        }));
        counts.sort((a, b) => a.count - b.count);
        selected = counts[0].model;
        break;
      }

      case 'random':
        selected = this.models[Math.floor(Math.random() * this.models.length)];
        break;

      case 'round-robin':
      default:
        selected = this.models[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.models.length;
        break;
    }

    this.requestCounts[selected] = (this.requestCounts[selected] || 0) + 1;
    return selected;
  }

  /**
   * Route request to a model
   */
  async route(task) {
    const modelProvider = this.selectModel();

    if (this.verbose) {
      console.log(`🔀 Routing to: ${modelProvider}`);
    }

    const client = createAIClient(modelProvider);
    const response = await client.chat([{ role: 'user', content: task }]);

    return {
      response: client.getTextContent(response),
      modelUsed: modelProvider,
      distribution: { ...this.requestCounts },
    };
  }

  /**
   * Get load distribution
   */
  getDistribution() {
    return { ...this.requestCounts };
  }
}
