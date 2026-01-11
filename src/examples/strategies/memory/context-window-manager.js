/**
 * Context Window Manager
 * Manages conversation context by keeping only recent messages
 */
export class ContextWindowManager {
  constructor(maxContextLength = 10) {
    this.maxContextLength = maxContextLength;
    this.messages = [];
  }

  addMessage(role, content) {
    this.messages.push({ role, content });

    // Keep only recent messages
    if (this.messages.length > this.maxContextLength) {
      // Keep system message and recent messages
      const systemMsg = this.messages[0];
      const recentMsgs = this.messages.slice(-(this.maxContextLength - 1));
      this.messages = [systemMsg, ...recentMsgs];
    }
  }

  getMessages() {
    return this.messages;
  }
}
