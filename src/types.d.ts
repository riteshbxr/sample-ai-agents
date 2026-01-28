/**
 * TypeScript Declarations for AI Agents Demo
 *
 * Provides type definitions for better IDE autocomplete and type checking
 * when using this library from JavaScript or TypeScript projects.
 */

// =============================================================================
// Chat Message Types
// =============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentBlock[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ContentBlock {
  type: 'text' | 'image' | 'image_url' | 'tool_use' | 'tool_result';
  text?: string;
  source?: ImageSource;
  image_url?: { url: string };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
}

export interface ImageSource {
  type: 'base64' | 'url';
  media_type?: string;
  data?: string;
  url?: string;
}

// =============================================================================
// Tool/Function Types
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: JSONSchema;
  input_schema?: JSONSchema;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  description?: string;
  default?: unknown;
}

// =============================================================================
// Response Types
// =============================================================================

export interface ChatResponse {
  id?: string;
  model?: string;
  choices?: Choice[];
  content?: ContentBlock[];
  usage?: UsageInfo;
  stop_reason?: string;
}

export interface Choice {
  index: number;
  message: ChatMessage;
  finish_reason?: string;
}

export interface UsageInfo {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface CostCalculation {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

// =============================================================================
// Chat Options
// =============================================================================

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  response_format?: { type: 'text' | 'json_object' };
  stream?: boolean;
  system?: string;
  [key: string]: unknown;
}

// =============================================================================
// Provider Types
// =============================================================================

export type Provider = 'openai' | 'openai-standard' | 'azure-openai' | 'claude' | 'mock';

// =============================================================================
// AI Client Interface
// =============================================================================

export interface AIClientInterface {
  /** Basic chat completion */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /** Streaming chat completion */
  chatStream(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    options?: ChatOptions
  ): Promise<string>;

  /** Chat with tool/function calling */
  chatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options?: ChatOptions
  ): Promise<ChatResponse>;

  /** Chat with functions (OpenAI format) */
  chatWithFunctions(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    options?: ChatOptions
  ): Promise<ChatResponse>;

  /** Get embeddings */
  getEmbeddings(input: string | string[], embeddingModel?: string): Promise<number[][]>;

  /** Analyze an image */
  analyzeImage(imageBase64: string, prompt: string, options?: ChatOptions): Promise<string>;

  /** Create an assistant (OpenAI only) */
  createAssistant(
    instructions: string,
    tools?: ToolDefinition[],
    options?: Record<string, unknown>
  ): Promise<unknown>;

  /** Create a thread (OpenAI only) */
  createThread(): Promise<unknown>;

  /** Add message to thread (OpenAI only) */
  addMessage(threadId: string, content: string, role?: string): Promise<unknown>;

  /** Get messages from thread (OpenAI only) */
  getMessages(threadId: string, options?: Record<string, unknown>): Promise<unknown[]>;

  /** Run assistant on thread (OpenAI only) */
  runAssistant(
    threadId: string,
    assistantId: string,
    options?: Record<string, unknown>
  ): Promise<unknown>;

  /** Retrieve run status (OpenAI only) */
  retrieveRun(threadId: string, runId: string): Promise<unknown>;

  /** Get text content from response */
  getTextContent(response: ChatResponse): string;

  /** Check if response has tool use */
  hasToolUse(response: ChatResponse): boolean;

  /** Get tool use blocks from response */
  getToolUseBlocks(response: ChatResponse): ToolCall[] | ContentBlock[];

  /** Calculate cost for response */
  calculateCost(response: ChatResponse, model?: string): CostCalculation;
}

// =============================================================================
// Client Factory
// =============================================================================

export function createAIClient(provider?: Provider, model?: string | null): AIClientInterface;
export function isValidProvider(provider: string): provider is Provider;

// =============================================================================
// Config Types
// =============================================================================

export interface Config {
  openai: {
    defaultProvider: 'azure-openai' | 'openai-standard';
    standardApiKey?: string;
    azureApiKey?: string;
    model: string;
    visionModel: string;
    azure: {
      enabled: boolean;
      endpoint?: string;
      apiVersion: string;
      deployment: string;
      embeddingDeployment: string;
    };
  };
  claude: {
    apiKey?: string;
    model: string;
    apiVersion: string;
  };
  chroma: {
    persistDirectory: string;
  };
  langfuse: {
    secretKey?: string;
    publicKey?: string;
    host: string;
  };
  logger: {
    level?: string;
    format?: string;
  };
}

export interface ProviderUtils {
  isTestEnvironment(): boolean;
  getDefaultProvider(): Provider;
  getDefaultVisionProvider(): Provider;
  getDefaultAssistantsProvider(): Provider;
  isProviderAvailable(provider: string): boolean;
  getDefaultModel(provider: string): string;
  getVisionModel(provider: string): string;
}

export interface DefaultOptions {
  getDefaultOptions(overrides?: ChatOptions): ChatOptions;
  getUseCaseOptions(
    useCase?: 'default' | 'creative' | 'precise' | 'structured' | 'streaming' | 'vision',
    provider?: string | null,
    overrides?: ChatOptions
  ): ChatOptions;
}

export const config: Config;
export const providerUtils: ProviderUtils;
export const defaultOptions: DefaultOptions;

// =============================================================================
// Service Types
// =============================================================================

export interface ChatServiceResponse {
  content: string;
  raw: ChatResponse;
  provider: Provider;
}

export class ChatService {
  constructor(provider?: Provider | null);
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatServiceResponse>;
  chatStream(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    options?: ChatOptions
  ): Promise<string>;
  getStructuredOutput(messages: ChatMessage[], options?: ChatOptions): Promise<unknown>;
  extractStructuredData(
    text: string,
    schema: string | string[],
    options?: ChatOptions
  ): Promise<unknown>;
}

// =============================================================================
// Agent Types
// =============================================================================

export class FunctionCallingAgent {
  constructor(provider?: Provider, client?: AIClientInterface | null);
  registerFunction(
    name: string,
    description: string,
    parameters: JSONSchema,
    implementation: (args: Record<string, unknown>) => Promise<unknown>
  ): void;
  executeFunction(name: string, args: Record<string, unknown>): Promise<unknown>;
  chat(userMessage: string, options?: { maxToolCallIterations?: number }): Promise<string>;
  resetConversation(): void;
  getConversationHistory(): ChatMessage[];
}

export class RAGAgent {
  constructor(provider?: Provider);
  initialize(): Promise<void>;
  addDocuments(documents: string[], metadatas?: Record<string, unknown>[], ids?: string[]): Promise<void>;
  query(question: string, topK?: number, options?: ChatOptions): Promise<string>;
  queryStream(
    question: string,
    onChunk?: (chunk: string) => void,
    topK?: number
  ): Promise<string>;
  deleteDocuments(ids: string[]): Promise<void>;
  getStats(): Promise<{ documentCount: number }>;
}

// =============================================================================
// Resilient Client Types
// =============================================================================

export interface ResilientClientOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeoutMs?: number;
}

export interface ResilientClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  circuitBreakerTrips: number;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successRate: number;
}

export class ResilientClient implements AIClientInterface {
  constructor(client: AIClientInterface, options?: ResilientClientOptions);
  getMetrics(): ResilientClientMetrics;
  reset(): void;
  // All AIClientInterface methods...
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    options?: ChatOptions
  ): Promise<string>;
  chatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options?: ChatOptions
  ): Promise<ChatResponse>;
  chatWithFunctions(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    options?: ChatOptions
  ): Promise<ChatResponse>;
  getEmbeddings(input: string | string[], embeddingModel?: string): Promise<number[][]>;
  analyzeImage(imageBase64: string, prompt: string, options?: ChatOptions): Promise<string>;
  createAssistant(
    instructions: string,
    tools?: ToolDefinition[],
    options?: Record<string, unknown>
  ): Promise<unknown>;
  createThread(): Promise<unknown>;
  addMessage(threadId: string, content: string, role?: string): Promise<unknown>;
  getMessages(threadId: string, options?: Record<string, unknown>): Promise<unknown[]>;
  runAssistant(
    threadId: string,
    assistantId: string,
    options?: Record<string, unknown>
  ): Promise<unknown>;
  retrieveRun(threadId: string, runId: string): Promise<unknown>;
  getTextContent(response: ChatResponse): string;
  hasToolUse(response: ChatResponse): boolean;
  getToolUseBlocks(response: ChatResponse): ToolCall[] | ContentBlock[];
  calculateCost(response: ChatResponse, model?: string): CostCalculation;
}

// =============================================================================
// Logger Types
// =============================================================================

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, error?: Error | Record<string, unknown>): void;
  child(childContext: string): Logger;
}

export function createLogger(context?: string): Logger;
export const logger: Logger;

// =============================================================================
// Pricing Types
// =============================================================================

export interface ModelPricing {
  input: number;
  output: number;
}

export interface PricingConfig {
  openai: Record<string, ModelPricing>;
  claude: Record<string, ModelPricing>;
  embeddings: Record<string, { input: number }>;
}

export const PRICING: PricingConfig;
