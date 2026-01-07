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
    const {
      userQuery,
      userHistory,
      maxRecommendations = 7,
      language,
    } = request;
    const historyStr = userHistory.slice(0, 50).join(', ');

    // Determine if response should be in Persian
    const isPersian =
      language === 'fa' || language === 'persian' || language === 'farsi';
    const languageInstruction = isPersian
      ? '\n\n🎬 PERSIAN LANGUAGE REQUIREMENTS:\n- Write ALL recommendation reasons ("reason" field) in Persian/Farsi language\n- Movie titles remain in their original form (English/Persian)\n- Include 2-3 Iranian/Persian films in your recommendations (films from Iran cinema)\n- Mix Iranian cinema with international films to provide variety\n- Consider classic and contemporary Iranian films based on the user\'s request'
      : '';

    // Add unique request ID to prevent caching
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    return [
      'You are an expert movie recommendation engine with deep knowledge of cinema across all genres, eras, and cultures.',
      'You have exceptional understanding of human emotions and can recommend movies that match specific moods and feelings.',
      'You understand and respect what users explicitly ask for - if they want sad movies, you recommend sad movies.',
      '',
      `[Request ID: ${requestId}]`,
      '',
      `User's viewing history: ${historyStr || 'No previous viewing history available'}`,
      '',
      `User's EXACT request: "${userQuery}"`,
      '',
      `Your task: Recommend ${maxRecommendations} movies that PRECISELY match what the user asked for in their request above.`,
      'READ THEIR REQUEST CAREFULLY - recommend exactly what they want, not what you think they need.',
      '',
      'CRITICAL GUIDELINES:',
      '- CAREFULLY read and understand EXACTLY what the user is asking for',
      '- If the user asks for sad/emotional/tragic films, recommend SAD and EMOTIONAL movies - DO NOT try to "cheer them up"',
      '- If the user asks for happy/uplifting films, recommend HAPPY and UPLIFTING movies',
      "- RESPECT the user's explicit request - they know what they want to watch",
      '- Match the MOOD and GENRE they specifically request, not what you think they need',
      "- Consider the user's viewing history and preferences when selecting movies",
      '- If the user writes in Persian/Farsi, include Iranian/Persian cinema in recommendations (mix with international films)',
      '- For Persian language queries, recommend 2-3 Iranian films alongside international films',
      '- Provide a mix of popular and hidden gem films',
      '- Include movies from different time periods when appropriate',
      '- Ensure each recommendation has a clear, compelling reason that explains HOW it matches their REQUEST',
      "- Avoid recommending movies that appear in the user's history",
      '- Include release year when known',
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
