import { FunctionCallingAgent } from '../../../agents/function-calling-agent.js';

/**
 * Base Agent with A2A Communication Capabilities
 */
export class A2AAgent {
  constructor(id, name, role, provider = 'openai') {
    this.id = id;
    this.name = name;
    this.role = role;
    this.agent = new FunctionCallingAgent(provider);
    this.messageBus = null;
    this.inbox = [];
    this.setupAgent();
  }

  setupAgent() {
    // Register function to send messages to other agents
    this.agent.registerFunction(
      'sendMessage',
      'Send a message to another agent',
      {
        type: 'object',
        properties: {
          toAgentId: { type: 'string', description: 'ID of the recipient agent' },
          message: { type: 'string', description: 'Message content to send' },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Message priority',
          },
        },
        required: ['toAgentId', 'message'],
      },
      async ({ toAgentId, message, priority = 'normal' }) => {
        if (this.messageBus) {
          const msg = this.messageBus.sendMessage(this.id, toAgentId, message, { priority });
          console.log(`  📤 [${this.name}] → [${toAgentId}]: ${message.substring(0, 60)}...`);
          return { success: true, messageId: msg.id };
        }
        return { success: false, error: 'Message bus not connected' };
      }
    );

    // Register function to broadcast messages
    this.agent.registerFunction(
      'broadcast',
      'Broadcast a message to all other agents',
      {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message content to broadcast' },
        },
        required: ['message'],
      },
      async ({ message }) => {
        if (this.messageBus) {
          const messages = this.messageBus.broadcast(this.id, message);
          console.log(`  📢 [${this.name}] Broadcast: ${message.substring(0, 60)}...`);
          return {
            success: true,
            recipients: messages.length,
            messageIds: messages.map((m) => m.id),
          };
        }
        return { success: false, error: 'Message bus not connected' };
      }
    );

    // Register function to check inbox
    this.agent.registerFunction(
      'checkInbox',
      'Check messages received from other agents',
      {
        type: 'object',
        properties: {
          unreadOnly: { type: 'boolean', description: 'Only return unread messages' },
        },
      },
      async ({ unreadOnly = true }) => {
        const messages = this.messageBus?.getMessages(this.id) || [];
        const relevant = unreadOnly
          ? messages.filter((m) => !m.read && m.to === this.id)
          : messages.filter((m) => m.to === this.id);

        // Mark as read
        relevant.forEach((m) => (m.read = true));

        return {
          count: relevant.length,
          messages: relevant.map((m) => ({
            from: m.from,
            content: m.content,
            timestamp: m.timestamp,
          })),
        };
      }
    );
  }

  /**
   * Connect agent to message bus
   */
  connect(messageBus) {
    this.messageBus = messageBus;
    messageBus.subscribe(this.id, (message) => {
      this.inbox.push(message);
      console.log(
        `  📥 [${this.name}] Received from [${message.from}]: ${message.content.substring(0, 60)}...`
      );
    });
  }

  /**
   * Process a task with A2A communication
   */
  async process(task, context = {}) {
    const systemPrompt = `You are ${this.name}, a ${this.role}. 
You can communicate with other agents using the sendMessage and broadcast functions.
You can check your inbox for messages from other agents using checkInbox.

Current context: ${JSON.stringify(context)}

Your task: ${task}

Work collaboratively with other agents to complete this task.`;

    return await this.agent.chat(systemPrompt);
  }
}
