import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMService } from './llm.service';
import { LLMRepository } from '../interfaces/llm-repository.interface';
import {
  LLMProviderType,
  LLMResponse,
} from '../interfaces/llm-provider.interface';

describe('LLMService', () => {
  let service: LLMService;
  let mockRepository: jest.Mocked<LLMRepository>;
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
    mockRepository = {
      getProvider: jest.fn(),
      getAvailableProviders: jest.fn(),
      getPrimaryProvider: jest.fn(),
      getFallbackProviders: jest.fn(),
      generateCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMService,
        {
          provide: 'LLMRepository',
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<LLMService>(LLMService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMovieRecommendations', () => {
    it('should generate movie recommendations successfully', async () => {
      const mockResponse: LLMResponse = {
        data: {
          recommendations: [
            { title: 'Test Movie', year: 2023, reason: 'Great test movie' },
          ],
        },
        model: 'test-model',
        provider: 'test-provider',
      };

      mockRepository.generateCompletion.mockResolvedValue(mockResponse);

      const result = await service.generateMovieRecommendations({
        userQuery: 'action movies',
        userHistory: ['Movie 1', 'Movie 2'],
        maxRecommendations: 5,
      });

      expect(result).toEqual(mockResponse.data);
      expect(mockRepository.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('action movies'),
          schema: expect.any(Object),
          temperature: 0.8,
          maxTokens: 2048,
          metadata: expect.objectContaining({
            language: undefined,
          }),
        }),
        undefined,
      );
    });

    it('should handle LLM service errors', async () => {
      mockRepository.generateCompletion.mockRejectedValue(
        new Error('LLM service error'),
      );

      await expect(
        service.generateMovieRecommendations({
          userQuery: 'action movies',
          userHistory: [],
        }),
      ).rejects.toThrow(
        'Failed to generate movie recommendations: LLM service error',
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health status successfully', async () => {
      const mockProvider = { name: 'test-provider' };
      mockRepository.getPrimaryProvider.mockResolvedValue(mockProvider as any);
      mockRepository.getAvailableProviders.mockResolvedValue([
        mockProvider as any,
      ]);

      const result = await service.healthCheck();

      expect(result).toEqual({
        primary: 'test-provider',
        available: ['test-provider'],
        total: 1,
      });
    });

    it('should handle health check errors gracefully', async () => {
      mockRepository.getPrimaryProvider.mockRejectedValue(
        new Error('No providers'),
      );
      mockRepository.getAvailableProviders.mockResolvedValue([]);

      const result = await service.healthCheck();

      expect(result).toEqual({
        primary: null,
        available: [],
        total: 0,
      });
    });
  });
});
