import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Lists (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register a user and capture token
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'lists@example.com', password: 'password123' })
      .expect(201);
    accessToken = registerRes.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /lists/:listName', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/lists/watchlist').expect(401);
    });

    it('should return empty array initially with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/lists/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(0);
    });

    it('should reject malformed JWT', async () => {
      await request(app.getHttpServer())
        .get('/lists/watchlist')
        .set('Authorization', 'Bearer x.y.z')
        .expect(401);
    });
  });

  describe('POST /lists/:listName', () => {
    it('should add a new movie to the list', async () => {
      const addRes = await request(app.getHttpServer())
        .post('/lists/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tmdbId: 100, title: 'A Movie' })
        .expect(201);

      expect(addRes.body).toMatchObject({ tmdbId: 100, title: 'A Movie' });

      const listRes = await request(app.getHttpServer())
        .get('/lists/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(listRes.body.items.find((m: any) => m.tmdbId === 100)).toBeTruthy();
    });

    it('should be idempotent when adding a duplicate movie (return 201 with existing)', async () => {
      await request(app.getHttpServer())
        .post('/lists/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tmdbId: 101, title: 'Duplicate Movie' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/lists/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tmdbId: 101, title: 'Duplicate Movie' })
        .expect(201);
      expect(res.body.tmdbId).toBe(101);
    });
  });

  describe('DELETE /lists/:listName/:tmdb_id', () => {
    it('should delete an existing movie', async () => {
      await request(app.getHttpServer())
        .post('/lists/watched')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tmdbId: 202, title: 'To Delete' })
        .expect(201);

      await request(app.getHttpServer())
        .delete('/lists/watched/202')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/lists/watched')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.items.find((m: any) => m.tmdbId === 202)).toBeFalsy();
    });
    describe('GET /lists/:listName pagination and sorting', () => {
      it('should paginate and sort results', async () => {
        // seed some items
        for (let i = 1; i <= 5; i++) {
          await request(app.getHttpServer())
            .post('/lists/custom')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ tmdbId: 300 + i, title: `Movie ${i}` })
            .expect(201);
        }

        const page1 = await request(app.getHttpServer())
          .get('/lists/custom?limit=2&page=1&sort=addedAt:desc')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        expect(page1.body.items.length).toBe(2);

        const page2 = await request(app.getHttpServer())
          .get('/lists/custom?limit=2&page=2&sort=addedAt:desc')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        expect(page2.body.items.length).toBe(2);
        expect(page1.body.items[0].addedAt >= page1.body.items[1].addedAt).toBeTruthy();
      });

      it('should support ascending sort', async () => {
        const res = await request(app.getHttpServer())
          .get('/lists/custom?limit=3&page=1&sort=addedAt:asc')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
        // ascending
        if (res.body.items.length >= 2) {
          expect(res.body.items[0].addedAt <= res.body.items[1].addedAt).toBeTruthy();
        }
      });

      it('should clamp unreasonable pagination values', async () => {
        const res = await request(app.getHttpServer())
          .get('/lists/custom?limit=1000&page=-5')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        // Should not crash and return array
        expect(res.body).toHaveProperty('items');
        expect(Array.isArray(res.body.items)).toBe(true);
      });
    });

    it('should return 404 when deleting a non-existent movie', async () => {
      await request(app.getHttpServer())
        .delete('/lists/watched/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
