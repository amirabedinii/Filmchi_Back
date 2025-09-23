import {
  LLMProvider,
  LLMProviderType,
  LLMRequest,
  LLMResponse,
} from './llm-provider.interface';

export interface LLMRepository {
  getProvider(type: LLMProviderType): Promise<LLMProvider>;
  getAvailableProviders(): Promise<LLMProvider[]>;
  getPrimaryProvider(): Promise<LLMProvider>;
  getFallbackProviders(): Promise<LLMProvider[]>;
  generateCompletion<T = any>(
    request: LLMRequest,
    preferredProvider?: LLMProviderType,
  ): Promise<LLMResponse<T>>;
}
