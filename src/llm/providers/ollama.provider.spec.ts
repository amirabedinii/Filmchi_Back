import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { OllamaProvider } from './ollama.provider';
import { LLMRequest } from '../interfaces/llm-provider.interface';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    // Suppress console errors during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console errors after tests
    consoleErrorSpy.mockRestore();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaProvider,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<OllamaProvider>(OllamaProvider);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should have correct name and supported models', () => {
    expect(provider.name).toBe('ollama');
    expect(provider.supportedModels).toContain('llama3.1');
    expect(provider.supportedModels).toContain('mistral');
  });

  describe('validateConfig', () => {
    it('should return true when OLLAMA_URL is configured', () => {
      configService.get.mockReturnValue('http://localhost:11434');

      const result = provider.validateConfig();

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('OLLAMA_URL');
    });

    it('should return false when OLLAMA_URL is not configured', () => {
      configService.get.mockReturnValue(undefined);

      const result = provider.validateConfig();

      expect(result).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_MODEL') return 'llama3.1';
        return undefined;
      });
      httpService.get.mockReturnValue(
        of({
          status: 200,
          data: { models: [{ name: 'llama3.1' }] },
        } as any),
      );

      const result = await provider.isAvailable();

      expect(result).toBe(true);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        { timeout: 5000 },
      );
    });

    it('should return false when Ollama is not available', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_MODEL') return 'llama3.1';
        return undefined;
      });
      httpService.get.mockReturnValue(
        throwError(() => new Error('Connection failed')),
      );

      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false when URL is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      const result = await provider.isAvailable();

      expect(result).toBe(false);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('should return false when configured model is not in tags list', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_MODEL') return 'llama3.1';
        return undefined;
      });
      httpService.get.mockReturnValue(
        of({ status: 200, data: { models: [{ name: 'mistral' }] } } as any),
      );

      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('generateCompletion', () => {
    const mockRequest: LLMRequest = {
      prompt: 'Test prompt',
      temperature: 0.7,
      maxTokens: 100,
    };

    it('should generate completion successfully', async () => {
      const mockResponse = {
        data: {
          response: 'Generated response',
          model: 'llama3.1',
          prompt_eval_count: 0,
          eval_count: 0,
        },
      };

      configService.get.mockImplementation((key: string) => {
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_MODEL') return 'llama3.1';
        return undefined;
      });

      httpService.post.mockReturnValue(of(mockResponse as any));

      const result = await provider.generateCompletion(mockRequest);

      expect(result).toEqual({
        data: 'Generated response',
        model: 'llama3.1',
        provider: 'ollama',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      });
    });

    it('should parse JSON when schema provided and map usage counters', async () => {
      const mockResponse = {
        data: {
          response: '{"recommendations":[{"title":"T","reason":"r"}]}',
          model: 'llama3.1',
          prompt_eval_count: 3,
          eval_count: 5,
          total_duration: 1000000,
        },
      };

      configService.get.mockImplementation((key: string) => {
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_MODEL') return 'llama3.1';
        return undefined;
      });
      httpService.post.mockReturnValue(of(mockResponse as any));

      const result = await provider.generateCompletion<{
        recommendations: Array<{ title: string; reason: string }>;
      }>({
        prompt: 'p',
        temperature: 0.2,
        maxTokens: 10,
        schema: { type: 'object' } as any,
      });

      expect(result.data.recommendations[0]).toEqual({
        title: 'T',
        reason: 'r',
      });
      expect(result.usage).toEqual({
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
      });
    });

    it('should throw error when prompt is empty', async () => {
      const invalidRequest: LLMRequest = {
        prompt: '',
        temperature: 0.7,
        maxTokens: 100,
      };

      await expect(provider.generateCompletion(invalidRequest)).rejects.toThrow(
        'Prompt is required and cannot be empty',
      );
    });

    it('should handle HTTP errors', async () => {
      // Avoid actual backoff delays by stubbing retryWithBackoff
      const retrySpy = jest
        .spyOn(provider as any, 'retryWithBackoff')
        .mockImplementation(async (operation: any) => {
          return operation();
        });
      configService.get.mockImplementation((key: string) => {
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_MODEL') return 'llama3.1';
        return undefined;
      });

      httpService.post.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(provider.generateCompletion(mockRequest)).rejects.toThrow(
        'Ollama request failed: Network error',
      );
      retrySpy.mockRestore();
    });

    it('should throw when schema is provided but response is invalid JSON', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_MODEL') return 'llama3.1';
        return undefined;
      });
      httpService.post.mockReturnValue(
        of({
          data: {
            response: '{invalid json',
            prompt_eval_count: 1,
            eval_count: 2,
          },
        } as any),
      );

      await expect(
        provider.generateCompletion({
          ...mockRequest,
          schema: { type: 'object' } as any,
        }),
      ).rejects.toThrow('Invalid JSON response from Ollama');
    });
  });
});
