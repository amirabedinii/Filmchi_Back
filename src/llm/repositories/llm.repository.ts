import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMRepository } from '../interfaces/llm-repository.interface';
import {
  LLMProvider,
  LLMProviderType,
  LLMRequest,
  LLMResponse,
} from '../interfaces/llm-provider.interface';
import { LLMProviderFactory } from '../factories/llm-provider.factory';

@Injectable()
export class LLMRepositoryImpl implements LLMRepository {
  private readonly logger = new Logger(LLMRepositoryImpl.name);
  private readonly providerCache = new Map<LLMProviderType, LLMProvider>();
  private readonly availabilityCache = new Map<
    LLMProviderType,
    { available: boolean; lastCheck: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly providerFactory: LLMProviderFactory,
    private readonly configService: ConfigService,
  ) {}

  async getProvider(type: LLMProviderType): Promise<LLMProvider> {
    // Check cache first
    if (this.providerCache.has(type)) {
      const cached = this.availabilityCache.get(type);
      const now = Date.now();

      if (
        cached &&
        cached.available &&
        now - cached.lastCheck < this.CACHE_TTL
      ) {
        const provider = this.providerCache.get(type);
        if (provider) {
          return provider;
        }
      }
    }

    // Create and validate provider
    const provider = await this.providerFactory.createAndValidateProvider(type);
    if (!provider) {
      this.availabilityCache.set(type, {
        available: false,
        lastCheck: Date.now(),
      });
      throw new Error(`Provider ${type} is not available or configured`);
    }

    // Cache the provider
    this.providerCache.set(type, provider);
    this.availabilityCache.set(type, {
      available: true,
      lastCheck: Date.now(),
    });

    return provider;
  }

  async getAvailableProviders(): Promise<LLMProvider[]> {
    const availableTypes = this.providerFactory.getAvailableProviderTypes();
    const providers: LLMProvider[] = [];

    for (const type of availableTypes) {
      try {
        const provider = await this.getProvider(type);
        providers.push(provider);
      } catch (error) {
        this.logger.debug(`Provider ${type} not available: ${error.message}`);
      }
    }

    return providers;
  }

  async getPrimaryProvider(): Promise<LLMProvider> {
    const priorityOrder = this.getProviderPriorityOrder();

    for (const type of priorityOrder) {
      try {
        return await this.getProvider(type);
      } catch (error) {
        this.logger.debug(
          `Primary provider ${type} not available: ${error.message}`,
        );
      }
    }

    throw new Error('No LLM providers are available');
  }

  async getFallbackProviders(): Promise<LLMProvider[]> {
    const available = await this.getAvailableProviders();
    const primary = await this.getPrimaryProvider().catch(() => null);

    if (!primary) {
      return available;
    }

    return available.filter((provider) => provider.name !== primary.name);
  }

  async generateCompletion<T = any>(
    request: LLMRequest,
    preferredProvider?: LLMProviderType,
  ): Promise<LLMResponse<T>> {
    const providers: LLMProvider[] = [];

    // If preferred provider is specified, try it first
    if (preferredProvider) {
      try {
        const preferred = await this.getProvider(preferredProvider);
        providers.push(preferred);
      } catch (error) {
        this.logger.warn(
          `Preferred provider ${preferredProvider} not available: ${error.message}`,
        );
      }
    }

    // Add primary provider if not already added
    try {
      const primary = await this.getPrimaryProvider();
      if (!providers.some((p) => p.name === primary.name)) {
        providers.push(primary);
      }
    } catch (error) {
      this.logger.warn(`Primary provider not available: ${error.message}`);
    }

    // Add fallback providers
    const fallbacks = await this.getFallbackProviders();
    for (const fallback of fallbacks) {
      if (!providers.some((p) => p.name === fallback.name)) {
        providers.push(fallback);
      }
    }

    if (providers.length === 0) {
      throw new Error('No LLM providers are available');
    }

    let lastError: Error | undefined;

    for (const provider of providers) {
      try {
        this.logger.debug(
          `Attempting completion with provider: ${provider.name}`,
        );
        const response = await provider.generateCompletion<T>(request);

        this.logger.debug(
          {
            provider: provider.name,
            promptLength: request.prompt.length,
            tokensUsed: response.usage?.totalTokens || 'unknown',
          },
          'LLM completion successful',
        );

        return response;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Provider ${provider.name} failed: ${error.message}`);

        // Mark provider as temporarily unavailable
        this.availabilityCache.set(provider.name as LLMProviderType, {
          available: false,
          lastCheck: Date.now(),
        });
      }
    }

    const errorMessage = lastError?.message || 'Unknown error';
    this.logger.error(`All LLM providers failed. Last error: ${errorMessage}`);
    throw new Error(`All LLM providers failed: ${errorMessage}`);
  }

  private getProviderPriorityOrder(): LLMProviderType[] {
    // For now, return Ollama as primary
    // In the future, this could be configurable via environment variables
    const primaryProvider = this.configService.get<string>(
      'LLM_PRIMARY_PROVIDER',
      'ollama',
    );

    const order = [primaryProvider as LLMProviderType];

    // Add other available providers as fallbacks
    const allTypes = this.providerFactory.getAvailableProviderTypes();
    for (const type of allTypes) {
      if (!order.includes(type)) {
        order.push(type);
      }
    }

    return order;
  }

  // Method to clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.providerCache.clear();
    this.availabilityCache.clear();
    this.logger.debug('Provider cache cleared');
  }
}
