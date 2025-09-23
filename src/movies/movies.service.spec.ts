import { Test } from '@nestjs/testing';
import { MoviesService } from './movies.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MovieRating } from '../entities/movie-rating.entity';
import { of } from 'rxjs';
import { TmdbService } from './tmdb.service';

describe('MoviesService', () => {
  let service: MoviesService;
  const httpMock = { get: jest.fn() } as any as HttpService;
  const configMock = {
    get: (k: string) => (k === 'TMDB_BEARER_TOKEN' ? 'bearer' : ''),
  } as any as ConfigService;
  const repoMock = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => ({ ...x })),
  };
  const tmdbMock = {
    get: jest.fn(),
  } as any as TmdbService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
        { provide: TmdbService, useValue: tmdbMock },
        { provide: getRepositoryToken(MovieRating), useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(MoviesService);
    jest.clearAllMocks();
  });

  it('searchMovies builds bearer request', async () => {
    (tmdbMock.get as any).mockResolvedValueOnce({ results: [] });
    const res = await service.searchMovies({ query: 'Matrix', page: 1 });
    expect(res).toEqual({ results: [] });
    expect(tmdbMock.get).toHaveBeenCalledWith('/search/movie', expect.any(Object));
  });

  it('getMovieDetails returns data', async () => {
    (tmdbMock.get as any).mockResolvedValueOnce({ id: 1 });
    const res = await service.getMovieDetails(1);
    expect(res.id).toBe(1);
    expect(tmdbMock.get).toHaveBeenCalledWith('/movie/1');
  });

  it('setUserRating creates or updates', async () => {
    (repoMock.findOne as any).mockResolvedValueOnce(null);
    const created = await service.setUserRating('u1', 10, 8);
    expect(created).toEqual({ tmdbId: 10, rating: 8 });

    (repoMock.findOne as any).mockResolvedValueOnce({ userId: 'u1', tmdbId: 10, rating: 5 });
    const updated = await service.setUserRating('u1', 10, 9);
    expect(updated).toEqual({ tmdbId: 10, rating: 9 });
  });
});


