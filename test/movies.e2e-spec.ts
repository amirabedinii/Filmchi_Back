import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('Movies (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        request: jest
          .fn()
          // search
          .mockReturnValueOnce(
            of({
              data: {
                results: [
                  { id: 1, title: 'Matrix', poster_path: '/poster.jpg' },
                ],
              },
            } as any),
          )
          // details
          .mockReturnValueOnce(
            of({
              data: { id: 1, title: 'Matrix', poster_path: '/poster.jpg' },
            } as any),
          )
          // trending
          .mockReturnValueOnce(
            of({
              data: { results: [{ id: 2, poster_path: '/poster.jpg' }] },
            } as any),
          )
          // popular
          .mockReturnValueOnce(
            of({
              data: { results: [{ id: 3, poster_path: '/poster.jpg' }] },
            } as any),
          )
          // top rated
          .mockReturnValueOnce(
            of({
              data: { results: [{ id: 4, poster_path: '/poster.jpg' }] },
            } as any),
          )
          // now playing
          .mockReturnValueOnce(
            of({
              data: { results: [{ id: 5, poster_path: '/poster.jpg' }] },
            } as any),
          )
          // upcoming
          .mockReturnValueOnce(
            of({
              data: { results: [{ id: 6, poster_path: '/poster.jpg' }] },
            } as any),
          )
          // similar
          .mockReturnValueOnce(
            of({
              data: { results: [{ id: 7, poster_path: '/poster.jpg' }] },
            } as any),
          ),
      })
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
    await request(app.getHttpServer())
      .get('/movies/search?q=Matrix')
      .expect(200)
      .expect((r) => expect(r.body.results[0].id).toBe(1));

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
