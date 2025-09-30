import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BaseLLMProvider } from './base-llm.provider';
import { LLMRequest, LLMResponse } from '../interfaces/llm-provider.interface';

@Injectable()
export class OpenRouterProvider extends BaseLLMProvider {
  readonly name = 'openrouter';
  readonly supportedModels = [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-opus',
    'google/gemini-pro',
    'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'mistralai/mistral-7b-instruct',
    'mistralai/mixtral-8x7b-instruct',
  ];

  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const baseURL = this.configService.get<string>(
      'OPENROUTER_BASE_URL',
      'https://openrouter.ai/api/v1',
    );
    const siteUrl = this.configService.get<string>('OPENROUTER_SITE_URL');
    const siteName = this.configService.get<string>('OPENROUTER_SITE_NAME');

    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not configured');
      return;
    }

    this.openai = new OpenAI({
      baseURL,
      apiKey,
      defaultHeaders: {
        ...(siteUrl && { 'HTTP-Referer': siteUrl }),
        ...(siteName && { 'X-Title': siteName }),
      },
    });
  }

  async generateCompletion<T = any>(
    request: LLMRequest,
  ): Promise<LLMResponse<T>> {
    this.validateRequest(request);

    if (!this.openai) {
      throw new Error('OpenRouter client not initialized');
    }

    const defaultModel = this.configService.get<string>(
      'OPENROUTER_MODEL',
      'openai/gpt-4o-mini',
    );
    const model = request.model || defaultModel;

    this.logger.debug(
      {
        model,
        promptLength: request.prompt.length,
        hasSchema: !!request.schema,
      },
      'Generating completion with OpenRouter',
    );

    // If schema is provided, append it to the prompt for better consistency
    let enhancedPrompt = request.prompt;
    if (request.schema) {
      enhancedPrompt += `\n\nYou MUST respond with valid JSON matching this exact schema:\n${JSON.stringify(request.schema, null, 2)}`;
    }
    
    // Add language instruction AFTER schema for maximum emphasis
    const language = request.metadata?.language;
    const isPersian = language === 'fa' || language === 'persian' || language === 'farsi';
    if (isPersian) {
      enhancedPrompt += `\n\n🔴 CRITICAL LANGUAGE REQUIREMENT 🔴\nYou MUST write the "reason" field in Persian/Farsi language.\nMovie titles stay in English, but ALL explanations and reasons MUST be written in فارسی.\nThis is mandatory and non-negotiable.`;
    }

    try {
      const completion = await this.retryWithBackoff(
        () =>
          this.openai.chat.completions.create({
            model,
            messages: [
              {
                role: 'user',
                content: enhancedPrompt,
              },
            ],
            max_tokens: request.maxTokens || 2048,
            temperature: request.temperature || 0.7,
            response_format: request.schema
              ? { type: 'json_object' }
              : undefined,
          }),
        2,
        2000,
      );

      let parsedData: T;
      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        throw new Error('No response content received from OpenRouter');
      }

      if (request.schema) {
        try {
          parsedData = JSON.parse(responseContent) as T;
        } catch (parseError) {
          this.logger.error(
            'Failed to parse JSON response from OpenRouter',
            parseError,
          );
          throw new Error('Invalid JSON response from OpenRouter');
        }
      } else {
        parsedData = responseContent as T;
      }

      const usage = completion.usage
        ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
        : undefined;

      this.logger.debug(
        {
          tokensUsed: usage?.total_tokens || 0,
          model,
        },
        'OpenRouter completion successful',
      );

      return this.createResponse(parsedData, model, usage);
    } catch (error) {
      this.logger.error(`OpenRouter completion failed: ${error.message}`, error);
      throw new Error(`OpenRouter request failed: ${error.message}`);
    }
  }

  validateConfig(): boolean {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const model = this.configService.get<string>('OPENROUTER_MODEL');

    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not configured');
      return false;
    }

    if (!model) {
      this.logger.warn('OPENROUTER_MODEL not configured');
      return false;
    }

    return true;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.validateConfig()) {
      return false;
    }

    if (!this.openai) {
      return false;
    }

    try {
      // Test the connection by making a simple request
      await this.openai.models.list();
      return true;
    } catch (error) {
      this.logger.warn(`OpenRouter availability check failed: ${error.message}`);
      return false;
    }
  }
}
