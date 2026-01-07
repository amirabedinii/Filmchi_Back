import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { LLMService } from '../src/llm/services/llm.service';

describe('Recommendations (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        post: jest.fn(() =>
          of({
            data: {
              recommendations: [
                { title: 'Inception', year: 2010, reason: 'mind-bending' },
              ],
            },
          } as any),
        ),
        get: jest
          .fn()
          // TMDB search
          .mockReturnValueOnce(
            of({ data: { results: [{ id: 27205 }] } } as any),
          )
          // TMDB details
          .mockReturnValueOnce(
            of({
              data: { id: 27205, poster_path: '/x.jpg', overview: 'desc' },
            } as any),
          ),
      })
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
});
