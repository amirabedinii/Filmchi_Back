import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TmdbService } from '../src/movies/tmdb.service';

describe('Movies (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const mockTmdbService = {
      hasAuthConfigured: jest.fn().mockReturnValue(true),
      searchMovie: jest.fn().mockResolvedValue({
        results: [{ id: 1, title: 'Matrix', poster_path: '/poster.jpg' }],
      }),
      getMovieDetails: jest.fn().mockResolvedValue({
        id: 1,
        title: 'Matrix',
        poster_path: '/poster.jpg',
      }),
      getTrending: jest.fn().mockResolvedValue({
        results: [{ id: 2, poster_path: '/poster.jpg' }],
      }),
      getPopular: jest.fn().mockResolvedValue({
        results: [{ id: 3, poster_path: '/poster.jpg' }],
      }),
      getTopRated: jest.fn().mockResolvedValue({
        results: [{ id: 4, poster_path: '/poster.jpg' }],
      }),
      getNowPlaying: jest.fn().mockResolvedValue({
        results: [{ id: 5, poster_path: '/poster.jpg' }],
      }),
      getUpcoming: jest.fn().mockResolvedValue({
        results: [{ id: 6, poster_path: '/poster.jpg' }],
      }),
      getSimilar: jest.fn().mockResolvedValue({
        results: [{ id: 7, poster_path: '/poster.jpg' }],
      }),
      // Mock for direct tmdb.get() calls used by searchMovies
      get: jest.fn().mockResolvedValue({
        results: [{ id: 1, title: 'Matrix', poster_path: '/poster.jpg', backdrop_path: '/backdrop.jpg' }],
      }),
      getGenres: jest.fn().mockResolvedValue({ genres: [] }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TmdbService)
      .useValue(mockTmdbService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'movies@example.com', password: 'password123' })
      .expect(201);
    accessToken = reg.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('search, details and lists', async () => {
    const searchRes = await request(app.getHttpServer())
      .get('/movies/search?q=Matrix')
      .expect(200);
    expect(searchRes.body).toHaveProperty('results');
    expect(Array.isArray(searchRes.body.results)).toBe(true);
    // Check if we have results (may be filtered by poster_path requirement)
    if (searchRes.body.results.length > 0) {
      expect(searchRes.body.results[0]).toHaveProperty('id');
    }

    await request(app.getHttpServer())
      .get('/movies/1')
      .expect(200)
      .expect((r) => expect(r.body.id).toBe(1));

    await request(app.getHttpServer()).get('/movies/trending').expect(200);
    await request(app.getHttpServer()).get('/movies/popular').expect(200);
    await request(app.getHttpServer()).get('/movies/top-rated').expect(200);
    await request(app.getHttpServer()).get('/movies/now-playing').expect(200);
    await request(app.getHttpServer()).get('/movies/upcoming').expect(200);
    await request(app.getHttpServer()).get('/movies/1/similar').expect(200);
  });

  it('bookmark and rating require auth and work', async () => {
    await request(app.getHttpServer())
      .post('/movies/10/bookmark')
      .send({ title: 'Inception' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/movies/10/bookmark')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Inception' })
      .expect(201)
      .expect((r) => expect(r.body.tmdbId).toBe(10));

    await request(app.getHttpServer())
      .post('/movies/10/rating')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 8 })
      .expect(201)
      .expect((r) => expect(r.body).toEqual({ tmdbId: 10, rating: 8 }));
  });
});
