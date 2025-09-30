export interface LLMRequest {
  prompt: string;
  schema?: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  metadata?: {
    language?: string;
    [key: string]: any;
  };
}

export interface LLMResponse<T = any> {
  data: T;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export interface LLMProvider {
  readonly name: string;
  readonly supportedModels: string[];

  generateCompletion<T = any>(request: LLMRequest): Promise<LLMResponse<T>>;
  validateConfig(): boolean;
  isAvailable(): Promise<boolean>;
}

export enum LLMProviderType {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  OPENROUTER = 'openrouter',
}

export interface LLMProviderConfig {
  type: LLMProviderType;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  enabled: boolean;
  priority: number;
  timeout?: number;
  retries?: number;
}
