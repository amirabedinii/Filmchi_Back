import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { RecommendationsService } from './recommendations.service';
import { ListsService } from '../lists/lists.service';

class ListsServiceMock {
  getMoviesForList = jest.fn();
}

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let listsService: ListsServiceMock;
  let httpService: jest.Mocked<HttpService>;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: ListsService, useClass: ListsServiceMock },
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
            get: (key: string) => {
              if (key === 'TMDB_API_KEY') return 'tmdb_test_key';
              if (key === 'OLLAMA_URL') return 'http://localhost:11434';
              return undefined;
            },
          },
        },
      ],
    })
      // Alias export from ListsModule using string token to avoid circular dep in unit test
      .useMocker((token) => token)
      .compile();

    service = moduleRef.get(RecommendationsService);
    listsService = moduleRef.get(ListsService);
    httpService = moduleRef.get(HttpService) as any;
    configService = moduleRef.get(ConfigService);
  });

  it('fetches watched and watchlist history from ListsService', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce([{ tmdbId: 1, title: 'A' }]);
    listsService.getMoviesForList.mockResolvedValueOnce([{ tmdbId: 2, title: 'B' }]);

    const ollamaResp: AxiosResponse<any> = {
      data: { recommendations: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as any;
    (httpService.post as jest.Mock).mockReturnValueOnce(of(ollamaResp));

    const result = await service.getRecommendations('user-1', 'funny space movies');
    expect(result).toEqual([]);
    expect(listsService.getMoviesForList).toHaveBeenCalledWith('user-1', 'watched', expect.any(Object));
    expect(listsService.getMoviesForList).toHaveBeenCalledWith('user-1', 'watchlist', expect.any(Object));
  });

  it('constructs prompt using history and user query', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce([{ tmdbId: 10, title: 'Interstellar' }]);
    listsService.getMoviesForList.mockResolvedValueOnce([{ tmdbId: 20, title: 'The Martian' }]);

    const capturedBodies: any[] = [];
    (httpService.post as jest.Mock).mockImplementation((url: string, body: any) => {
      capturedBodies.push({ url, body });
      const resp: AxiosResponse<any> = { data: { recommendations: [] } } as any;
      return of(resp);
    });

    await service.getRecommendations('user-1', 'smart sci-fi with humor');
    const call = capturedBodies[0];
    expect(call.url).toContain('http://localhost:11434');
    expect(JSON.stringify(call.body).toLowerCase()).toContain('interstellar');
    expect(JSON.stringify(call.body).toLowerCase()).toContain('the martian');
    expect(JSON.stringify(call.body)).toContain('smart sci-fi with humor');
  });

  it('calls TMDB to enrich each recommendation and merges results', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce([]);
    listsService.getMoviesForList.mockResolvedValueOnce([]);

    // Ollama returns two recs
    (httpService.post as jest.Mock).mockReturnValueOnce(
      of({ data: { recommendations: [{ title: 'Inception', year: 2010, reason: 'mind-bending' }] } } as any),
    );

    // TMDB search -> id
    (httpService.get as jest.Mock)
      // search
      .mockReturnValueOnce(
        of({ data: { results: [{ id: 27205 }] } } as any),
      )
      // movie details
      .mockReturnValueOnce(
        of({ data: { id: 27205, poster_path: '/x.jpg', overview: 'desc' } } as any),
      );

    const res = await service.getRecommendations('user-1', 'heist dream thriller');
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      title: 'Inception',
      year: 2010,
      reason: 'mind-bending',
      tmdbId: 27205,
    });
    expect(res[0]).toHaveProperty('posterPath');
    expect(res[0]).toHaveProperty('overview');
  });

  it('skips recommendations not found on TMDB', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce([]);
    listsService.getMoviesForList.mockResolvedValueOnce([]);

    (httpService.post as jest.Mock).mockReturnValueOnce(
      of({ data: { recommendations: [{ title: 'Unknown Movie', year: 1999, reason: 'test' }] } } as any),
    );

    // TMDB search returns empty
    (httpService.get as jest.Mock).mockReturnValueOnce(of({ data: { results: [] } } as any));

    const res = await service.getRecommendations('user-1', 'anything');
    expect(res).toEqual([]);
  });
});


