import '../test/setup';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('Users E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    // register & login to obtain token
    const email = `u${Date.now()}@example.com`;
    const password = 'StrongPassw0rd!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    accessToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /users/profile returns profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.email).toBeDefined();
  });

  it('PUT /users/profile updates profile', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Test User' })
      .expect(200);
    expect(res.body.displayName).toBe('Test User');
  });

  it('GET /users/stats returns counts', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.lists).toBeDefined();
    expect(res.body.items).toBeDefined();
  });
});


