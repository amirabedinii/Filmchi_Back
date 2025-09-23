import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  LLMProvider,
  LLMProviderType,
} from '../interfaces/llm-provider.interface';
import { OllamaProvider } from '../providers/ollama.provider';

@Injectable()
export class LLMProviderFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  createProvider(type: LLMProviderType): LLMProvider {
    switch (type) {
      case LLMProviderType.OLLAMA:
        return new OllamaProvider(this.httpService, this.configService);

      case LLMProviderType.OPENAI:
        throw new Error('OpenAI provider not yet implemented');

      case LLMProviderType.ANTHROPIC:
        throw new Error('Anthropic provider not yet implemented');

      case LLMProviderType.GEMINI:
        throw new Error('Gemini provider not yet implemented');

      default:
        throw new Error(`Unsupported LLM provider type: ${type}`);
    }
  }

  getAvailableProviderTypes(): LLMProviderType[] {
    return [
      LLMProviderType.OLLAMA,
      // LLMProviderType.OPENAI,
      // LLMProviderType.ANTHROPIC,
      // LLMProviderType.GEMINI,
    ];
  }

  async createAndValidateProvider(
    type: LLMProviderType,
  ): Promise<LLMProvider | null> {
    try {
      const provider = this.createProvider(type);

      if (!provider.validateConfig()) {
        return null;
      }

      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        return null;
      }

      return provider;
    } catch (error) {
      console.warn(
        `Failed to create or validate provider ${type}:`,
        error.message,
      );
      return null;
    }
  }
}
