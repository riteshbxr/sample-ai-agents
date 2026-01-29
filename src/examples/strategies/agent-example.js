import { FunctionCallingAgent } from '../../agents/function-calling-agent.js';
import { providerUtils } from '../../config.js';

/**
 * Function Calling Agent Example
 * Demonstrates how agents can use tools/functions to perform actions
 */

// Example functions that the agent can call
const functions = {
  // Email function
  sendEmail: async ({ to, subject, body }) => {
    console.log(`\n[FUNCTION CALLED] sendEmail`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  },

  // Weather function
  getWeather: async ({ location }) => {
    console.log(`\n[FUNCTION CALLED] getWeather`);
    console.log(`Location: ${location}`);
    // Mock weather data
    return {
      location,
      temperature: '72°F',
      condition: 'Sunny',
      humidity: '45%',
    };
  },

  // Calculator function
  calculate: async ({ expression }) => {
    console.log(`\n[FUNCTION CALLED] calculate`);
    console.log(`Expression: ${expression}`);
    try {
      // Safe evaluation (in production, use a proper math parser)
      const result = Function(`"use strict"; return (${expression})`)();
      return {
        expression,
        result,
      };
    } catch {
      return {
        error: 'Invalid expression',
      };
    }
  },
};

async function agentExample() {
  console.log('=== Function Calling Agent Example ===\n');

  // Choose provider: 'openai' or 'claude'
  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  const agent = new FunctionCallingAgent(provider);

  // Register functions
  agent.registerFunction(
    'sendEmail',
    'Send an email to a recipient',
    {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject',
        },
        body: {
          type: 'string',
          description: 'Email body content',
        },
      },
      required: ['to', 'subject', 'body'],
    },
    functions.sendEmail
  );

  agent.registerFunction(
    'getWeather',
    'Get current weather for a location',
    {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City or location name',
        },
      },
      required: ['location'],
    },
    functions.getWeather
  );

  agent.registerFunction(
    'calculate',
    'Perform a mathematical calculation',
    {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")',
        },
      },
      required: ['expression'],
    },
    functions.calculate
  );

  // Example conversations
  const conversations = [
    'Send an email to john@example.com about the meeting tomorrow at 3pm',
    'What is the weather in San Francisco?',
    'Calculate 25 * 4 + 10',
    'Send an email to team@startup.com with subject "AI Demo" and tell them about our new AI agent capabilities',
  ];

  for (const userMessage of conversations) {
    console.log(`\n👤 User: ${userMessage}`);
    console.log('🤖 Agent:');

    const response = await agent.chat(userMessage);
    console.log(response);
    console.log(`\n${'='.repeat(60)}`);
  }
}

// Run the example
agentExample().catch(console.error);
