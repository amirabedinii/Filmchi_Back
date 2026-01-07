import { Logger } from '@nestjs/common';
import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from '../interfaces/llm-provider.interface';

export abstract class BaseLLMProvider implements LLMProvider {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly name: string;
  abstract readonly supportedModels: string[];

  abstract generateCompletion<T = any>(
    request: LLMRequest,
  ): Promise<LLMResponse<T>>;
  abstract validateConfig(): boolean;
  abstract isAvailable(): Promise<boolean>;

  protected validateRequest(request: LLMRequest): void {
    if (!request.prompt?.trim()) {
      throw new Error('Prompt is required and cannot be empty');
    }
  }

  protected createResponse<T>(
    data: T,
    model: string,
    usage?: any,
  ): LLMResponse<T> {
    return {
      data,
      model,
      provider: this.name,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens || usage.promptTokens || 0,
            completionTokens:
              usage.completion_tokens || usage.completionTokens || 0,
            totalTokens: usage.total_tokens || usage.totalTokens || 0,
          }
        : undefined,
    };
  }

  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Unknown error during retry operation');
  }
}
