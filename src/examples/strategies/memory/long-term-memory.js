/**
 * Long-term Memory
 * Key-value storage for persistent information
 */
export class LongTermMemory {
  constructor() {
    this.memory = new Map();
  }

  store(key, value) {
    this.memory.set(key, {
      value,
      timestamp: new Date().toISOString(),
      accessCount: 0,
    });
  }

  retrieve(key) {
    const entry = this.memory.get(key);
    if (entry) {
      entry.accessCount++;
      return entry.value;
    }
    return null;
  }

  getAll() {
    return Array.from(this.memory.entries()).map(([key, data]) => ({
      key,
      ...data,
    }));
  }
}
