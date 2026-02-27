import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LLMService } from '../src/llm/services/llm.service';
import { TmdbService } from '../src/movies/tmdb.service';

describe('Recommendations (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const mockTmdbService = {
      hasAuthConfigured: jest.fn().mockReturnValue(true),
      searchMovie: jest.fn().mockResolvedValue({
        results: [{ id: 27205, title: 'Inception', poster_path: '/x.jpg' }],
      }),
      getMovieDetails: jest.fn().mockResolvedValue({
        id: 27205,
        title: 'Inception',
        poster_path: '/x.jpg',
        overview: 'desc',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TmdbService)
      .useValue(mockTmdbService)
      .overrideProvider(LLMService)
      .useValue({
        generateMovieRecommendations: jest.fn().mockResolvedValue({
          recommendations: [
            { title: 'Inception', year: 2010, reason: 'mind-bending' },
          ],
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'rec@example.com', password: 'password123' })
      .expect(201);
    accessToken = reg.body.accessToken;

    // seed a couple of list items to test history fetch doesn't break
    await request(app.getHttpServer())
      .post('/lists/watched')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tmdbId: 10, title: 'Interstellar' })
      .expect(201);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('should require auth', async () => {
    await request(app.getHttpServer())
      .post('/recommendations')
      .send({ query: 'space' })
      .expect(401);
  });

  it('should return enriched recommendations with token', async () => {
    await request(app.getHttpServer())
      .post('/recommendations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query: 'smart sci-fi' })
      .expect(201)
      .expect((r) => {
        expect(Array.isArray(r.body)).toBe(true);
        expect(r.body[0]).toHaveProperty('tmdbId');
        expect(r.body[0].title).toBe('Inception');
      });
  });

  describe('ورودی نامعتبر و شکست در تولید پیشنهاد', () => {
    it('should return 400 when query is too short (invalid input)', async () => {
      const res = await request(app.getHttpServer())
        .post('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'x' })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      await request(app.getHttpServer())
        .post('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 200 with empty array when LLM fails (controlled response)', async () => {
      const mockLlm = app.get(LLMService) as jest.Mocked<LLMService>;
      (mockLlm.generateMovieRecommendations as jest.Mock).mockResolvedValueOnce(
        { recommendations: [] },
      );

      const res = await request(app.getHttpServer())
        .post('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'sci-fi' })
        .expect(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should return 200 with empty array when LLM throws', async () => {
      const mockLlm = app.get(LLMService) as jest.Mocked<LLMService>;
      (mockLlm.generateMovieRecommendations as jest.Mock).mockRejectedValueOnce(
        new Error('LLM service unavailable'),
      );

      const res = await request(app.getHttpServer())
        .post('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'sci-fi' })
        .expect(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
});
