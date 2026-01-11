import { createAIClient } from '../../../clients/client-factory.js';

/**
 * Agent Orchestration Example
 * Demonstrates the intelligent tool routing/dispatching pattern used in galactiq
 *
 * In galactiq, the agentsOrchestrator.tool.ts uses createReactAgent to intelligently
 * route user queries to the appropriate specialized agent or tool.
 *
 * Key features:
 * - Intent recognition: Understands user intent from natural language
 * - Tool selection: Routes to the most appropriate tool/agent
 * - Multi-tool coordination: Can coordinate multiple tools if needed
 * - Context awareness: Uses conversation history for better routing
 */

/**
 * Base Tool Interface
 */
class OrchestrationTool {
  constructor(name, description, execute) {
    this.name = name;
    this.description = description;
    this.execute = execute;
  }

  toFunctionSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: this.getParameters(),
        required: this.getRequiredParameters(),
      },
    };
  }

  getParameters() {
    return {};
  }

  getRequiredParameters() {
    return [];
  }
}

/**
 * Email Template Generator Tool
 * Simulates galactiq's generateTemplateTool
 */
class EmailTemplateTool extends OrchestrationTool {
  constructor() {
    super(
      'generate_email_template',
      'Generates a fully designed, ready-to-use email template (HTML/MJML) tailored to the provided goal. Use when user wants to create an email template but does not request audience targeting or campaign setup.',
      async ({ templateDescription }) => {
        console.log(`  📧 [Email Template] Generating template: "${templateDescription}"`);
        return {
          templateId: `template_${Date.now()}`,
          status: 'generated',
          preview: `Email template for: ${templateDescription}`,
          message: 'Template generated successfully. You can edit it in the template editor.',
        };
      }
    );
  }

  getParameters() {
    return {
      templateDescription: {
        type: 'string',
        description: 'Short description of what the template is about',
      },
    };
  }

  getRequiredParameters() {
    return ['templateDescription'];
  }
}

/**
 * Segment Builder Tool
 * Simulates galactiq's generateSegmentTool
 */
class SegmentBuilderTool extends OrchestrationTool {
  constructor() {
    super(
      'generate_segment',
      'Generates a segment definition using the provided description. A segment is a group of contacts defined by combining filter conditions. Use when user wants to create or define a target audience segment.',
      async ({ description }) => {
        console.log(`  👥 [Segment Builder] Creating segment: "${description}"`);
        return {
          segmentId: `segment_${Date.now()}`,
          status: 'created',
          definition: `Segment definition based on: ${description}`,
          message:
            'Segment definition created. You can review and create it in the segment builder.',
        };
      }
    );
  }

  getParameters() {
    return {
      description: {
        type: 'string',
        description: 'Description of the segment (e.g., "users who opened emails in last 30 days")',
      },
    };
  }

  getRequiredParameters() {
    return ['description'];
  }
}

/**
 * Campaign Creator Tool
 * Simulates galactiq's emailCampaignCreator
 */
class CampaignCreatorTool extends OrchestrationTool {
  constructor() {
    super(
      'create_email_campaign',
      'Creates a complete, launch-ready email campaign including both email template and audience/segment targeting. Use when user explicitly wants to create and launch a specific email campaign with both content and targeting.',
      async ({ userQuery, templateId, recipientIds }) => {
        console.log(`  🚀 [Campaign Creator] Creating campaign: "${userQuery}"`);
        return {
          campaignId: `campaign_${Date.now()}`,
          status: 'created',
          templateId: templateId || 'auto-generated',
          segmentId: recipientIds ? `segment_${recipientIds.join('_')}` : 'auto-generated',
          message: 'Campaign created successfully. Ready for review and launch.',
        };
      }
    );
  }

  getParameters() {
    return {
      userQuery: {
        type: 'string',
        description: 'Complete user query describing the campaign',
      },
      templateId: {
        type: 'string',
        description: 'Optional: ID of existing template to use',
      },
      recipientIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: IDs of recipient lists',
      },
    };
  }

  getRequiredParameters() {
    return ['userQuery'];
  }
}

/**
 * Email Writer Tool
 * Simulates galactiq's emailWriterTool
 */
class EmailWriterTool extends OrchestrationTool {
  constructor() {
    super(
      'write_email_content',
      'Writes complete email content including body, subject line suggestions, and call to action. Use when user explicitly asks to write email content, not for template design or campaign setup.',
      async ({ prompt, tone, audience }) => {
        console.log(`  ✍️  [Email Writer] Writing email: "${prompt}"`);
        return {
          subject: `Subject: ${prompt.substring(0, 50)}...`,
          body: `Email body for: ${prompt}\nTone: ${tone}\nAudience: ${audience}`,
          cta: 'Call to action suggestion',
          message: 'Email content written successfully.',
        };
      }
    );
  }

  getParameters() {
    return {
      prompt: {
        type: 'string',
        description: "The user's request for the email content",
      },
      tone: {
        type: 'string',
        description: 'The tone of the email (e.g., professional, casual, friendly)',
        default: 'professional',
      },
      audience: {
        type: 'string',
        description: 'The target audience (e.g., consumers, b2b, developers)',
        default: 'consumers',
      },
    };
  }

  getRequiredParameters() {
    return ['prompt'];
  }
}

/**
 * Campaign Strategist Tool
 * Simulates galactiq's emailCampaignStrategistTool
 */
class CampaignStrategistTool extends OrchestrationTool {
  constructor() {
    super(
      'email_campaign_strategist',
      'Provides tailored email marketing strategies, recommendations, and actionable plans. Use when user is asking for strategy, planning, or recommendations about what kind of campaign to send, NOT for immediate execution.',
      async ({ userQuery }) => {
        console.log(`  📊 [Campaign Strategist] Providing strategy: "${userQuery}"`);
        return {
          strategy: `Strategic recommendations for: ${userQuery}`,
          recommendations: [
            'Recommendation 1: Focus on engagement metrics',
            'Recommendation 2: Segment your audience',
            'Recommendation 3: A/B test subject lines',
          ],
          message: 'Strategy and recommendations provided. Use campaign creator to execute.',
        };
      }
    );
  }

  getParameters() {
    return {
      userQuery: {
        type: 'string',
        description: 'User query about email marketing strategy',
      },
    };
  }

  getRequiredParameters() {
    return ['userQuery'];
  }
}

/**
 * Agent Orchestrator
 * Simulates galactiq's agentsOrchestratorTool pattern
 */
class AgentOrchestrator {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.client = createAIClient(provider);

    // Register all available tools
    this.tools = new Map();
    this.tools.set('generate_email_template', new EmailTemplateTool());
    this.tools.set('generate_segment', new SegmentBuilderTool());
    this.tools.set('create_email_campaign', new CampaignCreatorTool());
    this.tools.set('write_email_content', new EmailWriterTool());
    this.tools.set('email_campaign_strategist', new CampaignStrategistTool());

    this.conversationHistory = [];
  }

  /**
   * Orchestrate - Route user query to appropriate tool
   * This simulates the createReactAgent pattern from galactiq
   */
  async orchestrate(userQuery, context = {}) {
    console.log(`\n🎯 [Orchestrator] Processing query: "${userQuery}"\n`);

    // Build system prompt for tool selection
    const systemPrompt = `You are an intelligent assistant specialized in email marketing execution.
Your task is to analyze the user's query and accurately pick and call the right tool from the available options.

Available tools:
1. generate_email_template - For creating email templates (when user wants template design only)
2. generate_segment - For creating audience segments (when user wants segment definition only)
3. create_email_campaign - For complete campaign setup (when user wants both template AND targeting/sending)
4. write_email_content - For writing email copy/content (when user wants email text only)
5. email_campaign_strategist - For strategy and planning advice (when user asks for recommendations/strategy)

Important rules:
- If user wants to set up a campaign (using create_email_campaign), do NOT make separate calls to generate_segment or generate_email_template
- Only call generate_segment or generate_email_template directly if user intends to create them outside of campaign setup
- Use email_campaign_strategist for planning/strategy questions, NOT for execution
- Use write_email_content for email copy, NOT for template design

Current context: ${JSON.stringify(context)}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: userQuery },
    ];

    // Convert tools to function schemas
    const functions = Array.from(this.tools.values()).map((tool) => tool.toFunctionSchema());

    // Use function calling to let LLM select the tool
    // Use unified interface method for function calling
    // Convert functions to tools format (chatWithTools handles both formats)
    const tools = functions.map((f) => ({
      name: f.name,
      description: f.description,
      parameters: f.parameters, // OpenAI format
      input_schema: f.parameters, // Claude format (chatWithTools will handle conversion)
    }));
    const response = await this.client.chatWithTools(messages, tools);

    const message = response.choices?.[0]?.message || response.content?.[0];
    const toolCalls =
      message.tool_calls || message.content?.filter((c) => c.type === 'tool_use') || [];

    if (toolCalls.length > 0) {
      console.log(`✅ [Orchestrator] Selected ${toolCalls.length} tool(s)\n`);

      const results = [];
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name || toolCall.name;
        const toolParams = JSON.parse(
          toolCall.function?.arguments || JSON.stringify(toolCall.input || {})
        );

        console.log(`🔧 [Orchestrator] Executing: ${toolName}`);
        console.log(`   Parameters: ${JSON.stringify(toolParams, null, 2)}\n`);

        const tool = this.tools.get(toolName);
        if (tool) {
          const result = await tool.execute(toolParams);
          results.push({
            tool: toolName,
            result: result,
          });
          console.log(`✅ [Orchestrator] ${toolName} completed\n`);
        } else {
          console.log(`❌ [Orchestrator] Tool ${toolName} not found\n`);
        }
      }

      // Update conversation history
      this.conversationHistory.push({ role: 'user', content: userQuery });
      this.conversationHistory.push(message);

      return {
        selectedTools: toolCalls.map((tc) => tc.function?.name || tc.name),
        results: results,
        message: 'Orchestration completed successfully',
      };
    }

    // No tool selected - return direct response
    return {
      selectedTools: [],
      results: [],
      message: message.content || message.text || 'No tool selected',
    };
  }

  /**
   * Reset conversation history
   */
  reset() {
    this.conversationHistory = [];
  }
}

/**
 * Main example function
 */
async function agentOrchestrationExample() {
  console.log('=== Agent Orchestration Example ===');
  console.log('Intelligent tool routing pattern from galactiq\n');

  const provider =
    process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  const orchestrator = new AgentOrchestrator(provider);

  try {
    // Example 1: Template generation
    console.log('📝 Example 1: Template Generation Request');
    console.log('='.repeat(60));
    const result1 = await orchestrator.orchestrate(
      'Create an email template for a product launch announcement'
    );
    console.log(`\n📤 Result:`, JSON.stringify(result1, null, 2));

    // Example 2: Segment creation
    console.log('\n\n📝 Example 2: Segment Creation Request');
    console.log('='.repeat(60));
    const result2 = await orchestrator.orchestrate(
      'Create a segment for users who opened emails in the last 30 days'
    );
    console.log(`\n📤 Result:`, JSON.stringify(result2, null, 2));

    // Example 3: Campaign creation (should use campaign creator, not separate tools)
    console.log('\n\n📝 Example 3: Campaign Creation Request');
    console.log('='.repeat(60));
    orchestrator.reset(); // Reset for clean context
    const result3 = await orchestrator.orchestrate(
      'Create and send a welcome email campaign to all new users'
    );
    console.log(`\n📤 Result:`, JSON.stringify(result3, null, 2));

    // Example 4: Strategy request
    console.log('\n\n📝 Example 4: Strategy Request');
    console.log('='.repeat(60));
    const result4 = await orchestrator.orchestrate(
      'What are the best practices for re-engagement campaigns?'
    );
    console.log(`\n📤 Result:`, JSON.stringify(result4, null, 2));

    // Example 5: Email content writing
    console.log('\n\n📝 Example 5: Email Content Writing');
    console.log('='.repeat(60));
    const result5 = await orchestrator.orchestrate(
      'Write a professional email about our new product feature'
    );
    console.log(`\n📤 Result:`, JSON.stringify(result5, null, 2));

    console.log('\n✅ All orchestration examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Intent recognition: Understands user intent from natural language');
    console.log('  - Tool selection: Routes to the most appropriate tool');
    console.log('  - Context awareness: Uses conversation history');
    console.log('  - Multi-tool coordination: Can coordinate multiple tools if needed');
    console.log("  - Pattern matches galactiq's agentsOrchestratorTool implementation");
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
agentOrchestrationExample().catch(console.error);
