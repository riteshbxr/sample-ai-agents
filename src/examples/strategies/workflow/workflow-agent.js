import { FunctionCallingAgent } from '../../../agents/function-calling-agent.js';

/**
 * Agentic Workflow Agent
 * Demonstrates multi-step workflows where agents make decisions and iterate
 */
export class WorkflowAgent {
  constructor(provider = 'openai') {
    this.agent = new FunctionCallingAgent(provider);
    this.setupFunctions();
    this.workflowState = {
      step: 0,
      completed: [],
      currentTask: null,
      results: {},
    };
  }

  setupFunctions() {
    // Research function
    this.agent.registerFunction(
      'research',
      'Research a topic and gather information',
      {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic to research' },
          depth: { type: 'string', description: 'Research depth: shallow, medium, deep' },
        },
        required: ['topic'],
      },
      async ({ topic, depth = 'medium' }) => {
        console.log(`  🔍 Researching: ${topic} (${depth})`);
        // Mock research - in production, use real APIs
        const mockData = {
          'AI agents': 'AI agents are autonomous systems that can perform tasks using AI models',
          RAG: 'RAG combines retrieval and generation for knowledge-based AI',
          'function calling': 'Function calling allows AI to use external tools and APIs',
        };
        return {
          topic,
          findings: mockData[topic] || 'Research completed',
          sources: [`source1_${topic}`, `source2_${topic}`],
          depth,
        };
      }
    );

    // Analysis function
    this.agent.registerFunction(
      'analyze',
      'Analyze information and provide insights',
      {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data to analyze' },
          analysisType: {
            type: 'string',
            description: 'Type of analysis: summary, comparison, evaluation',
          },
        },
        required: ['data'],
      },
      async ({ data, analysisType = 'summary' }) => {
        console.log(`  📊 Analyzing data (${analysisType})...`);
        return {
          analysis: `Analysis of ${data.substring(0, 50)}...`,
          type: analysisType,
          insights: ['Key insight 1', 'Key insight 2'],
        };
      }
    );

    // Decision function
    this.agent.registerFunction(
      'makeDecision',
      'Make a decision based on available information',
      {
        type: 'object',
        properties: {
          options: {
            type: 'array',
            description: 'Array of options to choose from',
            items: { type: 'string' },
          },
          criteria: { type: 'string', description: 'Criteria for decision' },
        },
        required: ['options', 'criteria'],
      },
      async ({ options, criteria }) => {
        console.log(`  🤔 Making decision based on: ${criteria}`);
        return {
          decision: options[0] || 'Option A',
          reasoning: `Selected based on ${criteria}`,
          confidence: 0.85,
        };
      }
    );

    // Validation function
    this.agent.registerFunction(
      'validate',
      'Validate if a result meets requirements',
      {
        type: 'object',
        properties: {
          result: { type: 'string', description: 'Result to validate' },
          requirements: { type: 'string', description: 'Requirements to check against' },
        },
        required: ['result', 'requirements'],
      },
      async () => {
        console.log(`  ✅ Validating result against requirements...`);
        return {
          valid: true,
          score: 0.9,
          feedback: 'Result meets most requirements',
          improvements: ['Could add more detail'],
        };
      }
    );
  }

  async executeWorkflow(goal) {
    console.log(`\n🎯 Starting Workflow: ${goal}`);
    console.log('='.repeat(60));

    this.workflowState.currentTask = goal;

    // Step 1: Research phase
    console.log('\n📚 Step 1: Research Phase');
    const researchPrompt = `Research information about: ${goal}. 
    Use the research function to gather comprehensive information.`;
    const researchResult = await this.agent.chat(researchPrompt);
    this.workflowState.completed.push('research');
    this.workflowState.results.research = researchResult;
    console.log(`✅ Research completed`);

    // Step 2: Analysis phase
    console.log('\n📊 Step 2: Analysis Phase');
    const analysisPrompt = `Based on the research: "${researchResult.substring(0, 200)}", 
    analyze the information and provide key insights. Use the analyze function.`;
    const analysisResult = await this.agent.chat(analysisPrompt);
    this.workflowState.completed.push('analysis');
    this.workflowState.results.analysis = analysisResult;
    console.log(`✅ Analysis completed`);

    // Step 3: Decision phase
    console.log('\n🤔 Step 3: Decision Phase');
    const decisionPrompt = `Based on the research and analysis, make a decision about: ${goal}.
    Consider the options and use the makeDecision function.`;
    const decisionResult = await this.agent.chat(decisionPrompt);
    this.workflowState.completed.push('decision');
    this.workflowState.results.decision = decisionResult;
    console.log(`✅ Decision made`);

    // Step 4: Validation phase
    console.log('\n✅ Step 4: Validation Phase');
    const validationPrompt = `Validate the decision and results. 
    Check if they meet the original goal: ${goal}. Use the validate function.`;
    const validationResult = await this.agent.chat(validationPrompt);
    this.workflowState.completed.push('validation');
    this.workflowState.results.validation = validationResult;
    console.log(`✅ Validation completed`);

    return this.workflowState;
  }

  async iterativeWorkflow(goal, maxIterations = 3) {
    console.log(`\n🔄 Starting Iterative Workflow: ${goal}`);
    console.log('='.repeat(60));

    let iteration = 1;
    let currentResult = null;

    while (iteration <= maxIterations) {
      console.log(`\n🔄 Iteration ${iteration}/${maxIterations}`);

      const prompt =
        iteration === 1
          ? `Work on: ${goal}. Start by researching and creating an initial solution.`
          : `Based on previous work: "${currentResult?.substring(0, 200)}", 
           improve and refine the solution for: ${goal}.`;

      currentResult = await this.agent.chat(prompt);
      console.log(`Result (iteration ${iteration}): ${currentResult.substring(0, 150)}...`);

      // Check if we should continue
      if (iteration < maxIterations) {
        const continuePrompt = `Evaluate if the current solution for "${goal}" needs improvement. 
        If it's good enough, say "COMPLETE". Otherwise, suggest what to improve.`;
        const evaluation = await this.agent.chat(continuePrompt);

        if (evaluation.includes('COMPLETE') || evaluation.toLowerCase().includes('good enough')) {
          console.log(`\n✅ Solution is complete after ${iteration} iterations`);
          break;
        }
      }

      iteration++;
    }

    return currentResult;
  }

  getWorkflowState() {
    return this.workflowState;
  }
}
