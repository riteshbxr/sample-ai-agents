/**
 * Message Bus for Agent Communication
 * Handles message routing and delivery between agents
 */
export class AgentMessageBus {
  constructor() {
    this.messages = [];
    this.subscribers = new Map(); // agentId -> callback
  }

  /**
   * Subscribe an agent to receive messages
   */
  subscribe(agentId, callback) {
    this.subscribers.set(agentId, callback);
  }

  /**
   * Send a message from one agent to another
   */
  sendMessage(fromAgentId, toAgentId, message, metadata = {}) {
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: fromAgentId,
      to: toAgentId,
      content: message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.messages.push(msg);

    // Deliver message if recipient is subscribed
    if (this.subscribers.has(toAgentId)) {
      const callback = this.subscribers.get(toAgentId);
      callback(msg);
    }

    return msg;
  }

  /**
   * Broadcast message to all agents except sender
   */
  broadcast(fromAgentId, message, metadata = {}) {
    const recipients = Array.from(this.subscribers.keys()).filter((id) => id !== fromAgentId);
    return recipients.map((toId) => this.sendMessage(fromAgentId, toId, message, metadata));
  }

  /**
   * Get messages for a specific agent
   */
  getMessages(agentId) {
    return this.messages.filter((msg) => msg.to === agentId || msg.from === agentId);
  }
}
