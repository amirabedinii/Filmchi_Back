import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';
import { EnrichedRecommendation } from './recommendations.service';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let recommendationsService: jest.Mocked<RecommendationsService>;

  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@example.com',
    },
  };

  const mockRecommendations: EnrichedRecommendation[] = [
    {
      title: 'Inception',
      year: 2010,
      reason: 'Mind-bending sci-fi thriller',
      tmdbId: 27205,
      posterPath: '/poster1.jpg',
      overview: 'A thief who steals corporate secrets...',
    },
    {
      title: 'Interstellar',
      year: 2014,
      reason: 'Space exploration epic',
      tmdbId: 157336,
      posterPath: '/poster2.jpg',
      overview: 'A team of explorers travel through a wormhole...',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: {
            getRecommendations: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    recommendationsService = module.get(RecommendationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('get', () => {
    it('should return recommendations successfully', async () => {
      const body: GetRecommendationsDto = {
        query: 'sci-fi movies with time travel',
      };

      recommendationsService.getRecommendations.mockResolvedValue(
        mockRecommendations,
      );

      const result = await controller.get(mockRequest, body);

      expect(recommendationsService.getRecommendations).toHaveBeenCalledWith(
        mockRequest.user.userId,
        body.query,
        undefined,
        expect.objectContaining({
          includeAdult: false,
          maxCertification: 'PG-13',
          certificationCountry: 'US',
        }),
      );
      expect(result).toEqual(mockRecommendations);
    });

    it('should return empty array when no recommendations found', async () => {
      const body: GetRecommendationsDto = {
        query: 'very obscure genre',
      };

      recommendationsService.getRecommendations.mockResolvedValue([]);

      const result = await controller.get(mockRequest, body);

      expect(recommendationsService.getRecommendations).toHaveBeenCalledWith(
        mockRequest.user.userId,
        body.query,
        undefined,
        expect.objectContaining({
          includeAdult: false,
          maxCertification: 'PG-13',
          certificationCountry: 'US',
        }),
      );
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const body: GetRecommendationsDto = {
        query: 'action movies',
      };

      const error = new Error('Service unavailable');
      recommendationsService.getRecommendations.mockRejectedValue(error);

      await expect(controller.get(mockRequest, body)).rejects.toThrow(
        'Service unavailable',
      );

      expect(recommendationsService.getRecommendations).toHaveBeenCalledWith(
        mockRequest.user.userId,
        body.query,
        undefined,
        expect.objectContaining({
          includeAdult: false,
          maxCertification: 'PG-13',
          certificationCountry: 'US',
        }),
      );
    });

    it('should handle different user IDs', async () => {
      const differentRequest = {
        user: {
          userId: 'user-456',
          email: 'different@example.com',
        },
      };

      const body: GetRecommendationsDto = {
        query: 'comedy movies',
      };

      recommendationsService.getRecommendations.mockResolvedValue([]);

      await controller.get(differentRequest, body);

      expect(recommendationsService.getRecommendations).toHaveBeenCalledWith(
        'user-456',
        body.query,
        undefined,
        expect.objectContaining({
          includeAdult: false,
          maxCertification: 'PG-13',
          certificationCountry: 'US',
        }),
      );
    });

    it('should handle various query types', async () => {
      const testCases = [
        'horror movies',
        'romantic comedies from the 90s',
        'action movies with Jason Statham',
        'animated movies for kids',
        '',
      ];

      recommendationsService.getRecommendations.mockResolvedValue([]);

      for (const query of testCases) {
        const body: GetRecommendationsDto = { query };

        await controller.get(mockRequest, body);

        expect(recommendationsService.getRecommendations).toHaveBeenCalledWith(
          mockRequest.user.userId,
          query,
          undefined,
          expect.objectContaining({
            includeAdult: false,
            maxCertification: 'PG-13',
            certificationCountry: 'US',
          }),
        );
      }

      expect(recommendationsService.getRecommendations).toHaveBeenCalledTimes(
        testCases.length,
      );
    });
  });
});