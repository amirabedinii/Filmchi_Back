import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BaseLLMProvider } from './base-llm.provider';
import { LLMRequest, LLMResponse } from '../interfaces/llm-provider.interface';

@Injectable()
export class OllamaProvider extends BaseLLMProvider {
  readonly name = 'ollama';
  readonly supportedModels = [
    'llama3.1',
    'llama3.2',
    'codellama',
    'mistral',
    'neural-chat',
    'starling-lm',
    'llama2',
    'gemma',
    'qwen',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async generateCompletion<T = any>(
    request: LLMRequest,
  ): Promise<LLMResponse<T>> {
    this.validateRequest(request);

    const baseUrl = this.configService.get<string>(
      'OLLAMA_URL',
      'http://localhost:11434',
    );
    const defaultModel = this.configService.get<string>(
      'OLLAMA_MODEL',
      'llama3.1',
    );
    const model = request.model || defaultModel;

    // Enhance prompt with language instruction if needed
    let enhancedPrompt = request.prompt;
    const language = request.metadata?.language;
    const isPersian =
      language === 'fa' || language === 'persian' || language === 'farsi';
    if (isPersian && request.schema) {
      enhancedPrompt += `\n\n🔴 CRITICAL: Write the "reason" field in Persian/Farsi (فارسی). Movie titles in English, explanations in فارسی.`;
    }

    const payload = {
      model,
      prompt: enhancedPrompt,
      stream: false,
      format: request.schema,
      options: {
        temperature: request.temperature || 0.7,
        num_predict: request.maxTokens || 2048,
      },
    };

    this.logger.debug(
      {
        model,
        promptLength: request.prompt.length,
        hasSchema: !!request.schema,
      },
      'Generating completion with Ollama',
    );

    try {
      const response = await this.retryWithBackoff(
        () =>
          firstValueFrom(
            this.httpService.post(`${baseUrl}/api/generate`, payload, {
              timeout: 30000,
            }),
          ),
        2,
        2000,
      );

      let parsedData: T;
      const responseData = response.data;

      if (request.schema && responseData.response) {
        try {
          parsedData = JSON.parse(responseData.response) as T;
        } catch (parseError) {
          this.logger.error(
            'Failed to parse JSON response from Ollama',
            parseError,
          );
          throw new Error('Invalid JSON response from Ollama');
        }
      } else {
        parsedData = responseData.response as T;
      }

      const usage = {
        prompt_tokens: responseData.prompt_eval_count || 0,
        completion_tokens: responseData.eval_count || 0,
        total_tokens:
          (responseData.prompt_eval_count || 0) +
          (responseData.eval_count || 0),
      };

      this.logger.debug(
        {
          tokensUsed: usage.total_tokens,
          completionTime: responseData.total_duration
            ? `${responseData.total_duration / 1000000}ms`
            : 'unknown',
        },
        'Ollama completion successful',
      );

      return this.createResponse(parsedData, model, usage);
    } catch (error) {
      this.logger.error(`Ollama completion failed: ${error.message}`, error);
      throw new Error(`Ollama request failed: ${error.message}`);
    }
  }

  validateConfig(): boolean {
    const baseUrl = this.configService.get<string>('OLLAMA_URL');
    const model = this.configService.get<string>('OLLAMA_MODEL');

    if (!baseUrl) {
      this.logger.warn('OLLAMA_URL not configured');
      return false;
    }

    if (!model) {
      this.logger.warn('OLLAMA_MODEL not configured');
      return false;
    }

    return true;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.validateConfig()) {
      return false;
    }

    try {
      const baseUrl = this.configService.get<string>(
        'OLLAMA_URL',
        'http://localhost:11434',
      );
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/api/tags`, { timeout: 5000 }),
      );

      const models = response.data?.models || [];
      const configuredModel = this.configService.get<string>(
        'OLLAMA_MODEL',
        'llama3.1',
      );

      const modelAvailable = models.some(
        (model: any) =>
          model.name?.includes(configuredModel) ||
          model.model?.includes(configuredModel),
      );

      if (!modelAvailable) {
        this.logger.warn(
          `Configured model ${configuredModel} not found in Ollama. Available models: ${models.map((m: any) => m.name || m.model).join(', ')}`,
        );
      }

      return modelAvailable;
    } catch (error) {
      this.logger.warn(`Ollama availability check failed: ${error.message}`);
      return false;
    }
  }
}
