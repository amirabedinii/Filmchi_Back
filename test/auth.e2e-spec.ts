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
          expect(res.body.accessToken).toBeDefined();
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
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'login@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);
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
          expect(res.body.accessToken).toBeDefined();
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
  });
});
