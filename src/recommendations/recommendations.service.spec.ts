import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { RecommendationsService } from './recommendations.service';
import { ListsService } from '../lists/lists.service';
import { LLMService } from '../llm/services/llm.service';
import { TmdbService } from '../movies/tmdb.service';

class ListsServiceMock {
  getMoviesForList = jest.fn();
}

class LLMServiceMock {
  generateMovieRecommendations = jest.fn();
}

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let listsService: ListsServiceMock;
  let llmService: LLMServiceMock;
  let httpService: jest.Mocked<HttpService>;
  let configService: ConfigService;
  let tmdbService: jest.Mocked<TmdbService>;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    // Suppress console logs during tests
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => { });
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterAll(() => {
    // Restore console logs after tests
    consoleDebugSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: ListsService, useClass: ListsServiceMock },
        { provide: LLMService, useClass: LLMServiceMock },
        { provide: TmdbService, useValue: { searchMovie: jest.fn(), getMovieDetails: jest.fn(), hasAuthConfigured: jest.fn().mockReturnValue(true) } },
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
      .compile();

    service = moduleRef.get(RecommendationsService);
    listsService = moduleRef.get(ListsService);
    llmService = moduleRef.get(LLMService);
    httpService = moduleRef.get(HttpService);
    configService = moduleRef.get(ConfigService);
    tmdbService = moduleRef.get(TmdbService) as any;
  });

  it('fetches watched and watchlist history from ListsService', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce({
      items: [{ tmdbId: 1, title: 'A' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    listsService.getMoviesForList.mockResolvedValueOnce({
      items: [{ tmdbId: 2, title: 'B' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    llmService.generateMovieRecommendations.mockResolvedValueOnce({
      recommendations: []
    });

    const result = await service.getRecommendations(
      'user-1',
      'funny space movies',
    );
    expect(result).toEqual([]);
    expect(listsService.getMoviesForList).toHaveBeenCalledWith(
      'user-1',
      'watched',
      expect.any(Object),
    );
    expect(listsService.getMoviesForList).toHaveBeenCalledWith(
      'user-1',
      'watchlist',
      expect.any(Object),
    );
  });

  it('constructs prompt using history and user query', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce({
      items: [{ tmdbId: 10, title: 'Interstellar' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    listsService.getMoviesForList.mockResolvedValueOnce({
      items: [{ tmdbId: 20, title: 'The Martian' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    llmService.generateMovieRecommendations.mockResolvedValueOnce({
      recommendations: []
    });

    await service.getRecommendations('user-1', 'smart sci-fi with humor');

    expect(llmService.generateMovieRecommendations).toHaveBeenCalledWith({
      userQuery: 'smart sci-fi with humor',
      userHistory: ['Interstellar', 'The Martian'],
      maxRecommendations: 7,
    });
  });

  it('calls TMDB to enrich each recommendation and merges results', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });

    // LLM Service returns recommendations
    llmService.generateMovieRecommendations.mockResolvedValueOnce({
      recommendations: [
        { title: 'Inception', year: 2010, reason: 'mind-bending' },
      ],
    });

    // TMDB search -> id and details via wrapper
    (tmdbService.searchMovie as jest.Mock).mockResolvedValueOnce({ results: [{ id: 27205 }] });
    (tmdbService.getMovieDetails as jest.Mock).mockResolvedValueOnce({ id: 27205, poster_path: '/x.jpg', overview: 'desc' });

    const res = await service.getRecommendations(
      'user-1',
      'heist dream thriller',
    );
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
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });

    llmService.generateMovieRecommendations.mockResolvedValueOnce({
      recommendations: [
        { title: 'Unknown Movie', year: 1999, reason: 'test' },
      ],
    });

    // TMDB search returns empty
    (tmdbService.searchMovie as jest.Mock).mockResolvedValueOnce({ results: [] });

    const res = await service.getRecommendations('user-1', 'anything');
    expect(res).toEqual([]);
  });

  it('returns [] when LLM service throws', async () => {
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    llmService.generateMovieRecommendations.mockRejectedValueOnce(
      new Error('LLM service error'),
    );

    const res = await service.getRecommendations('user-1', 'q');
    expect(res).toEqual([]);
  });

  it('returns minimal items when TMDB_API_KEY missing', async () => {
    // Simulate missing TMDB auth
    (tmdbService.hasAuthConfigured as jest.Mock).mockReturnValueOnce(false);

    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    llmService.generateMovieRecommendations.mockResolvedValueOnce({
      recommendations: [
        { title: 'Movie A', reason: 'test' },
        { title: 'Movie B', year: 2000, reason: 'test2' },
      ],
    });

    const res = await service.getRecommendations('user-1', 'q');
    expect(res).toEqual([
      { title: 'Movie A', reason: 'test', tmdbId: 0 },
      { title: 'Movie B', year: 2000, reason: 'test2', tmdbId: 0 },
    ]);
  });

  it('uses bearer token path for TMDB when provided and handles TMDB error gracefully', async () => {
    // Leave auth configured; simulate details failure

    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    llmService.generateMovieRecommendations.mockResolvedValueOnce({
      recommendations: [
        { title: 'X', year: 2015, reason: 'reason' },
      ],
    });

    // Simulate TMDB search success, details throws to exercise catch
    (tmdbService.searchMovie as jest.Mock).mockResolvedValueOnce({ results: [{ id: 1, title: 'X', release_date: '2015-01-01' }] });
    (tmdbService.getMovieDetails as jest.Mock).mockRejectedValueOnce(new Error('TMDB details failure'));

    const res = await service.getRecommendations('user-1', 'q');
    // Because details returned null-ish, enrichment returns null and gets filtered -> []
    expect(res).toEqual([]);
  });

  it('returns null from findOnTmdb when TMDB search request fails', async () => {
    // Ensure API key present
    const cfg = configService as any;
    jest.spyOn(cfg, 'get').mockImplementation((key: string) => {
      if (key === 'TMDB_API_KEY') return 'tmdb_test_key';
      return undefined;
    });

    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    listsService.getMoviesForList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    llmService.generateMovieRecommendations.mockResolvedValueOnce({
      recommendations: [
        { title: 'Y', reason: 'r' },
      ],
    });

    // First TMDB call throws
    (tmdbService.searchMovie as jest.Mock).mockRejectedValueOnce(new Error('search fail'));

    const res = await service.getRecommendations('user-1', 'q');
    expect(res).toEqual([]);
  });

  it('pickBestTmdbMatch uses threshold to discard poor matches', async () => {
    // Directly exercise private logic through public flow
    const anyService = service as any;
    const results = [
      { id: 1, title: 'zzzzzzzzzzzzzzzzzzzzzzzzzz', release_date: '1900-01-01', popularity: 0 },
      { id: 2, title: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx', release_date: '1800-01-01', popularity: 0 },
    ];
    const picked = anyService.pickBestTmdbMatch('Target Title', 2020, results);
    expect(picked).toBeNull();
  });
});
