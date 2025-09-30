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
  language?: string;
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
      temperature: 0.8,
      maxTokens: 2048,
      metadata: {
        language: request.language,
      },
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
    const { userQuery, userHistory, maxRecommendations = 7, language } = request;
    const historyStr = userHistory.slice(0, 50).join(', ');
    
    // Determine if response should be in Persian
    const isPersian = language === 'fa' || language === 'persian' || language === 'farsi';
    const languageInstruction = isPersian 
      ? '\n\nIMPORTANT: Write ALL recommendation reasons ("reason" field) in Persian/Farsi language. The movie titles should remain in their original English form, but explanations must be in Persian.'
      : '';

    return [
      'You are an expert movie recommendation engine with deep knowledge of cinema across all genres, eras, and cultures.',
      'You have exceptional understanding of human emotions and can recommend movies that match specific moods and feelings.',
      '',
      `User's viewing history: ${historyStr || 'No previous viewing history available'}`,
      '',
      `User's current emotional state and request: "${userQuery}"`,
      '',
      `Please recommend ${maxRecommendations} movies that match the user's emotional state and request.`,
      '',
      'CRITICAL GUIDELINES:',
      '- CAREFULLY analyze the user\'s emotional state from their request',
      '- If the user feels sad, down, or unwell, recommend UPLIFTING, COMFORTING, and FEEL-GOOD movies',
      '- AVOID complex, mind-bending, or emotionally heavy films when user needs comfort',
      '- Recommend movies that can genuinely improve their mood',
      '- Provide a mix of popular and hidden gem films',
      '- Include movies from different time periods when appropriate',
      '- Ensure each recommendation has a clear, compelling reason that explains HOW it matches their emotional needs',
      "- Avoid recommending movies that appear to be in the user's history",
      '- Include release year when known',
      '- Prioritize emotional resonance over intellectual complexity when user needs comfort',
      languageInstruction,
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
