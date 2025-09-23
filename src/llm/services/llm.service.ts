import { Injectable, Logger, Inject } from '@nestjs/common';
import type { LLMRepository } from '../interfaces/llm-repository.interface';
import {
  LLMProviderType,
  LLMRequest,
  LLMResponse,
} from '../interfaces/llm-provider.interface';

export interface RecommendationRequest {
  userQuery: string;
  userHistory: string[];
  maxRecommendations?: number;
}

export interface RecommendationResponse {
  recommendations: Array<{
    title: string;
    year?: number;
    reason: string;
  }>;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    @Inject('LLMRepository') private readonly llmRepository: LLMRepository,
  ) {}

  async generateMovieRecommendations(
    request: RecommendationRequest,
    preferredProvider?: LLMProviderType,
  ): Promise<RecommendationResponse> {
    const prompt = this.buildMovieRecommendationPrompt(request);
    const schema = this.getMovieRecommendationSchema(
      request.maxRecommendations || 7,
    );

    const llmRequest: LLMRequest = {
      prompt,
      schema,
      temperature: 0.7,
      maxTokens: 2048,
    };

    this.logger.debug(
      {
        userQuery: request.userQuery,
        historyCount: request.userHistory.length,
        maxRecommendations: request.maxRecommendations,
        preferredProvider,
      },
      'Generating movie recommendations',
    );

    try {
      const response =
        await this.llmRepository.generateCompletion<RecommendationResponse>(
          llmRequest,
          preferredProvider,
        );

      this.logger.debug(
        {
          provider: response.provider,
          model: response.model,
          recommendationCount: response.data?.recommendations?.length || 0,
          tokensUsed: response.usage?.totalTokens,
        },
        'Movie recommendations generated successfully',
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to generate movie recommendations: ${error.message}`,
        error,
      );
      throw new Error(
        `Failed to generate movie recommendations: ${error.message}`,
      );
    }
  }

  async generateCompletion<T = any>(
    request: LLMRequest,
    preferredProvider?: LLMProviderType,
  ): Promise<LLMResponse<T>> {
    return this.llmRepository.generateCompletion<T>(request, preferredProvider);
  }

  async getAvailableProviders(): Promise<string[]> {
    const providers = await this.llmRepository.getAvailableProviders();
    return providers.map((p) => p.name);
  }

  async healthCheck(): Promise<{
    primary: string | null;
    available: string[];
    total: number;
  }> {
    try {
      const [primary, available] = await Promise.all([
        this.llmRepository.getPrimaryProvider().catch(() => null),
        this.llmRepository.getAvailableProviders(),
      ]);

      return {
        primary: primary?.name || null,
        available: available.map((p) => p.name),
        total: available.length,
      };
    } catch (error) {
      this.logger.error(`LLM health check failed: ${error.message}`);
      return {
        primary: null,
        available: [],
        total: 0,
      };
    }
  }

  private buildMovieRecommendationPrompt(
    request: RecommendationRequest,
  ): string {
    const { userQuery, userHistory, maxRecommendations = 7 } = request;
    const historyStr = userHistory.slice(0, 50).join(', ');

    return [
      'You are an expert movie recommendation engine with deep knowledge of cinema across all genres, eras, and cultures.',
      '',
      `User's viewing history: ${historyStr || 'No previous viewing history available'}`,
      '',
      `User's current request: "${userQuery}"`,
      '',
      `Please recommend ${maxRecommendations} movies that match the user's request. Consider their viewing history to avoid duplicates and provide diverse, high-quality recommendations.`,
      '',
      'Guidelines:',
      '- Provide a mix of popular and hidden gem films',
      '- Include movies from different time periods when appropriate',
      '- Ensure each recommendation has a clear, compelling reason',
      "- Avoid recommending movies that appear to be in the user's history",
      '- Include release year when known',
      '',
      'Return your response as JSON strictly matching the provided schema.',
    ].join('\n');
  }

  private getMovieRecommendationSchema(maxRecommendations: number) {
    return {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          minItems: Math.min(3, maxRecommendations),
          maxItems: maxRecommendations,
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The movie title',
              },
              year: {
                type: 'number',
                description: 'Release year (optional)',
              },
              reason: {
                type: 'string',
                description: 'Why this movie is recommended',
              },
            },
            required: ['title', 'reason'],
            additionalProperties: false,
          },
        },
      },
      required: ['recommendations'],
      additionalProperties: false,
    };
  }
}
