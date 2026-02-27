import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should return 409 Conflict when trying to register with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409);
    });

    describe('ثبت‌نام با داده نامعتبر (validation)', () => {
      it('should return 400 when email is invalid', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'not-an-email', password: 'password123' })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toBeDefined();
            expect(Array.isArray(res.body.message) || typeof res.body.message === 'object').toBe(true);
          });
      });

      it('should return 400 when password is too short', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'valid@example.com', password: '12345' })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toBeDefined();
          });
      });

      it('should return 400 when email is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({ password: 'password123' })
          .expect(400);
      });

      it('should return 400 when password is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'valid@example.com' })
          .expect(400);
      });
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'login@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register').send(userData);
    });

    it('should login successfully with valid credentials', () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should return 401 Unauthorized with incorrect password', () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should refresh tokens and then logout', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      };
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);
      const refreshToken = loginRes.body.refreshToken as string;

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // Old refresh should no longer work
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });

    it('logout should be idempotent', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      };
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);
      const refreshToken = loginRes.body.refreshToken as string;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);
      // Logging out again should still return success
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);
    });
  });
});
