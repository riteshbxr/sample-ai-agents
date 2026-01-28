# 🎓 Beginner's Guide to AI Development

Welcome! This guide will help you get started with AI development for customer experience applications.

## 📋 Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Your API Key
```bash
# Copy the example environment file
cp env.example .env

# Edit .env and add your API key:
# Option A: OpenAI (recommended for beginners)
OPENAI_API_KEY=your_openai_key_here

# Option B: Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
```

### Step 3: Run Your First Example
```bash
npm run demo:hello-ai
```

🎉 **That's it!** You've just had your first AI conversation.

---

## 🛤️ Learning Path

We recommend following this order:

### Level 1: Basics (Start Here!)
| Example | What You'll Learn | Command |
|---------|------------------|---------|
| Hello AI | Your first AI conversation | `npm run demo:hello-ai` |
| Chat with Context | System prompts & conversation history | `npm run demo:chat-context` |

### Level 2: Customer Experience
| Example | What You'll Learn | Command |
|---------|------------------|---------|
| Customer Support Bot | Complete support chatbot | `npm run demo:customer-support` |
| FAQ Bot | Knowledge base Q&A | `npm run demo:faq-bot` |
| Sentiment Analysis | Analyze customer feedback | `npm run demo:sentiment` |

### Level 3: Intermediate
| Example | What You'll Learn | Command |
|---------|------------------|---------|
| Streaming | Real-time responses | `npm run demo:streaming` |
| Structured Output | Get JSON responses | `npm run demo:structured` |
| Function Calling | AI that can use tools | `npm run demo:agent` |

### Level 4: Advanced
| Example | What You'll Learn | Command |
|---------|------------------|---------|
| RAG | Search & answer from documents | `npm run demo:rag` |
| Multi-Agent | Multiple AI agents collaborating | `npm run demo:multi-agent` |
| Autonomous Agent | Self-directed AI agents | `npm run demo:autonomous` |

---

## 💡 Key Concepts Explained Simply

### What is a "Message"?
AI conversations use messages. Each message has:
- **role**: Who's talking (`user` = you, `assistant` = AI, `system` = instructions)
- **content**: What they're saying

```javascript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
];
```

### What is a "System Prompt"?
The system prompt tells the AI WHO it should be. It's like giving the AI a job description:

```javascript
const systemPrompt = `You are Alex, a friendly customer support agent for TechStore.
You help with orders, returns, and product questions.
Always be polite and helpful.`;
```

### What is "Temperature"?
Temperature controls how creative vs consistent the AI is:
- **0.0 - 0.3**: Very consistent (good for facts, support)
- **0.4 - 0.7**: Balanced (good for general chat)
- **0.8 - 1.0**: Very creative (good for brainstorming)

```javascript
// Consistent responses
await client.chat(messages, { temperature: 0.2 });

// Creative responses
await client.chat(messages, { temperature: 0.9 });
```

### What is "Streaming"?
Instead of waiting for the entire response, you get it word by word:
- Better user experience
- Feels faster
- Essential for chat interfaces

---

## 🛍️ Common Customer Experience Use Cases

### 1. Customer Support Bot
**What it does**: Answers customer questions, looks up orders, handles complaints
**Best for**: E-commerce, SaaS, service companies
**Example**: `npm run demo:customer-support`

### 2. FAQ Bot
**What it does**: Answers questions from your knowledge base
**Best for**: Help centers, documentation, internal wikis
**Example**: `npm run demo:faq-bot`

### 3. Sentiment Analysis
**What it does**: Analyzes customer feedback to detect emotions and urgency
**Best for**: Review analysis, ticket triage, survey analysis
**Example**: `npm run demo:sentiment`

### 4. Product Recommendations
**What it does**: Suggests products based on customer needs
**Best for**: E-commerce, content platforms
**Example**: See the customer support bot example

---

## 📝 Code Templates

### Basic Chat (Copy & Paste Starter)
```javascript
import { createAIClient } from './src/clients/client-factory.js';

const client = createAIClient('openai');

const response = await client.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
]);

console.log(client.getTextContent(response));
```

### Support Bot Template
```javascript
import { createAIClient } from './src/clients/client-factory.js';

const client = createAIClient('openai');

// Your company's system prompt
const systemPrompt = `You are a customer support agent for [Your Company].
Your name is [Bot Name].

Our policies:
- Returns: [Your return policy]
- Shipping: [Your shipping policy]

Be friendly and helpful!`;

// Chat function
async function chat(userMessage, history = []) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage }
  ];
  
  const response = await client.chat(messages);
  return client.getTextContent(response);
}

// Use it
const reply = await chat("What's your return policy?");
console.log(reply);
```

---

## ❓ Frequently Asked Questions

### Q: Which API key should I use?
**A**: For beginners, we recommend **OpenAI** (get a key at platform.openai.com). It's the easiest to set up.

### Q: How much does it cost?
**A**: Costs vary by usage. For learning/testing:
- GPT-3.5: ~$0.002 per 1,000 tokens (very cheap)
- GPT-4: ~$0.03 per 1,000 tokens
- Rough estimate: 1,000 tokens ≈ 750 words

Most examples cost less than $0.01 to run.

### Q: What if I get an error?
**A**: Common issues:
1. **"No provider available"**: Check your API key in `.env`
2. **"Rate limit"**: You're sending too many requests. Wait and retry.
3. **"Invalid API key"**: Double-check your key is correct

### Q: Can I use this in production?
**A**: Yes! But add:
- Error handling (see `demo:error-handling`)
- Rate limiting (see `demo:batch`)
- Cost tracking (see `demo:cost-tracking`)

---

## 🔗 Next Steps

1. **Run the beginner examples** in order
2. **Modify them** for your use case
3. **Read TUTORIAL.md** for deeper understanding
4. **Explore advanced patterns** when ready

## 📚 Resources

- **Full Tutorial**: [TUTORIAL.md](./TUTORIAL.md)
- **API Documentation**: [src/clients/README.md](./src/clients/README.md)
- **All Examples**: Run `npm start` for interactive menu

---

**Questions?** Open an issue or check the examples for working code!

Happy building! 🚀
