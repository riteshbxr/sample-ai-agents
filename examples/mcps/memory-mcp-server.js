/**
 * Memory MCP Server
 * Provides persistent knowledge storage: entities, facts, and semantic search
 *
 * Usage: node examples/mcps/memory-mcp-server.js
 * Then call via HTTP POST to http://localhost:3005/run
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Memory storage
class MemoryStore {
  constructor() {
    this.entities = new Map(); // Named entities with properties
    this.facts = []; // Individual facts
    this.conversations = new Map(); // Conversation summaries
    this.notes = []; // Free-form notes
  }

  // Entity management
  createEntity(name, type, properties = {}) {
    const id = `entity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entity = {
      id,
      name,
      type,
      properties,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.entities.set(id, entity);
    return entity;
  }

  getEntity(id) {
    return this.entities.get(id);
  }

  findEntities(query = {}) {
    let results = Array.from(this.entities.values());

    if (query.type) {
      results = results.filter((e) => e.type === query.type);
    }
    if (query.name) {
      const nameLower = query.name.toLowerCase();
      results = results.filter((e) => e.name.toLowerCase().includes(nameLower));
    }
    if (query.property) {
      const [key, value] = Object.entries(query.property)[0];
      results = results.filter((e) => e.properties[key] === value);
    }

    return results;
  }

  updateEntity(id, properties) {
    const entity = this.entities.get(id);
    if (!entity) throw new Error(`Entity ${id} not found`);

    entity.properties = { ...entity.properties, ...properties };
    entity.updatedAt = new Date().toISOString();
    return entity;
  }

  deleteEntity(id) {
    if (!this.entities.has(id)) throw new Error(`Entity ${id} not found`);
    this.entities.delete(id);
    return { success: true, id };
  }

  // Fact management
  addFact(subject, predicate, object, confidence = 1.0, source = null) {
    const fact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      subject,
      predicate,
      object,
      confidence,
      source,
      createdAt: new Date().toISOString(),
    };
    this.facts.push(fact);
    return fact;
  }

  queryFacts(query = {}) {
    let results = this.facts;

    if (query.subject) {
      const subjectLower = query.subject.toLowerCase();
      results = results.filter((f) => f.subject.toLowerCase().includes(subjectLower));
    }
    if (query.predicate) {
      results = results.filter((f) => f.predicate === query.predicate);
    }
    if (query.object) {
      const objectLower = query.object.toLowerCase();
      results = results.filter((f) => f.object.toLowerCase().includes(objectLower));
    }
    if (query.minConfidence) {
      results = results.filter((f) => f.confidence >= query.minConfidence);
    }

    return results;
  }

  // Note management
  addNote(content, tags = [], metadata = {}) {
    const note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      tags,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.notes.push(note);
    return note;
  }

  searchNotes(query, tags = []) {
    let results = this.notes;

    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter((n) => n.content.toLowerCase().includes(queryLower));
    }
    if (tags.length > 0) {
      results = results.filter((n) => tags.some((t) => n.tags.includes(t)));
    }

    return results;
  }

  // Conversation summary management
  saveConversationSummary(conversationId, summary, keyPoints = [], entities = []) {
    const conv = {
      id: conversationId,
      summary,
      keyPoints,
      entities,
      savedAt: new Date().toISOString(),
    };
    this.conversations.set(conversationId, conv);
    return conv;
  }

  getConversationSummary(conversationId) {
    return this.conversations.get(conversationId);
  }

  // Semantic search (simple keyword-based, could be enhanced with embeddings)
  search(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const results = [];

    // Search entities
    for (const entity of this.entities.values()) {
      const score = this.calculateRelevance(queryLower, [
        entity.name,
        entity.type,
        ...Object.values(entity.properties).map(String),
      ]);
      if (score > 0) {
        results.push({ type: 'entity', item: entity, score });
      }
    }

    // Search facts
    for (const fact of this.facts) {
      const score = this.calculateRelevance(queryLower, [
        fact.subject,
        fact.predicate,
        fact.object,
      ]);
      if (score > 0) {
        results.push({ type: 'fact', item: fact, score });
      }
    }

    // Search notes
    for (const note of this.notes) {
      const score = this.calculateRelevance(queryLower, [note.content, ...note.tags]);
      if (score > 0) {
        results.push({ type: 'note', item: note, score });
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  calculateRelevance(query, texts) {
    const words = query.split(/\s+/);
    let score = 0;

    for (const text of texts) {
      if (!text) continue;
      const textLower = text.toLowerCase();

      for (const word of words) {
        if (textLower.includes(word)) {
          score += 1;
          // Bonus for exact match
          if (textLower === word) score += 2;
        }
      }
    }

    return score;
  }

  // Stats
  getStats() {
    return {
      entities: this.entities.size,
      facts: this.facts.length,
      notes: this.notes.length,
      conversations: this.conversations.size,
    };
  }

  // Export all data
  export() {
    return {
      entities: Array.from(this.entities.values()),
      facts: this.facts,
      notes: this.notes,
      conversations: Array.from(this.conversations.values()),
    };
  }

  // Import data
  import(data) {
    if (data.entities) {
      for (const e of data.entities) {
        this.entities.set(e.id, e);
      }
    }
    if (data.facts) this.facts.push(...data.facts);
    if (data.notes) this.notes.push(...data.notes);
    if (data.conversations) {
      for (const c of data.conversations) {
        this.conversations.set(c.id, c);
      }
    }
    return this.getStats();
  }

  // Clear all data
  clear() {
    this.entities.clear();
    this.facts = [];
    this.notes = [];
    this.conversations.clear();
    return { success: true };
  }
}

// Global memory store
const memory = new MemoryStore();

// Pre-populate with sample data
memory.createEntity('OpenAI', 'company', {
  founded: 2015,
  ceo: 'Sam Altman',
  products: ['GPT-4', 'DALL-E', 'ChatGPT'],
});
memory.createEntity('Anthropic', 'company', {
  founded: 2021,
  ceo: 'Dario Amodei',
  products: ['Claude'],
});
memory.addFact('GPT-4', 'is_developed_by', 'OpenAI', 1.0, 'public knowledge');
memory.addFact('Claude', 'is_developed_by', 'Anthropic', 1.0, 'public knowledge');
memory.addNote('MCP (Model Context Protocol) is a standard for AI tool integration', [
  'mcp',
  'ai',
  'tools',
]);

// Available methods
const methods = {
  // Entity methods
  async create_entity({ name, type, properties }) {
    return memory.createEntity(name, type, properties);
  },

  async get_entity({ id }) {
    return memory.getEntity(id);
  },

  async find_entities({ type, name, property }) {
    return { entities: memory.findEntities({ type, name, property }) };
  },

  async update_entity({ id, properties }) {
    return memory.updateEntity(id, properties);
  },

  async delete_entity({ id }) {
    return memory.deleteEntity(id);
  },

  // Fact methods
  async add_fact({ subject, predicate, object, confidence, source }) {
    return memory.addFact(subject, predicate, object, confidence, source);
  },

  async query_facts({ subject, predicate, object, minConfidence }) {
    return { facts: memory.queryFacts({ subject, predicate, object, minConfidence }) };
  },

  // Note methods
  async add_note({ content, tags, metadata }) {
    return memory.addNote(content, tags, metadata);
  },

  async search_notes({ query, tags }) {
    return { notes: memory.searchNotes(query, tags) };
  },

  // Conversation methods
  async save_conversation({ conversationId, summary, keyPoints, entities }) {
    return memory.saveConversationSummary(conversationId, summary, keyPoints, entities);
  },

  async get_conversation({ conversationId }) {
    return memory.getConversationSummary(conversationId);
  },

  // Search across all
  async search({ query, limit }) {
    return { results: memory.search(query, limit) };
  },

  // Utility methods
  async get_stats() {
    return memory.getStats();
  },

  async export_memory() {
    return memory.export();
  },

  async import_memory({ data }) {
    return memory.import(data);
  },

  async clear_memory() {
    return memory.clear();
  },
};

// Main endpoint
app.post('/run', async (req, res) => {
  const { method, params } = req.body || {};

  if (!method || !methods[method]) {
    return res.status(400).json({
      ok: false,
      error: `Unknown method: ${method}. Available: ${Object.keys(methods).join(', ')}`,
    });
  }

  try {
    const result = await methods[method](params || {});
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', stats: memory.getStats() });
});

// List available methods
app.get('/methods', (req, res) => {
  res.json({ methods: Object.keys(methods) });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Memory MCP server listening on http://localhost:${PORT}/run`);
  console.log(`Available methods: ${Object.keys(methods).join(', ')}`);
  console.log(`Pre-loaded with sample entities and facts`);
});
