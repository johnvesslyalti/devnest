import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/app';
import { getTestDbUrl } from './utils/config';
import { migrateDb, resetDb, seedTestData, SeededData } from './utils/db';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.POSTGRES_URL = getTestDbUrl();
    migrateDb();
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health', () => {
    it('should return status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect({ status: 'ok' });
    });
  });

  describe('/auth', () => {
    const registerDto = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    describe('POST /register', () => {
      it('should register a new user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(201);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('message', 'User registered successfully');
        expect(response.headers['set-cookie']).toBeDefined();
      });

      it('should fail if email already exists', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(409);
      });
    });

    describe('POST /login', () => {
      beforeEach(async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto);
      });

      it('should login successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginDto)
          .expect(201);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.headers['set-cookie']).toBeDefined();
      });

      it('should fail with wrong password', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ ...loginDto, password: 'wrongpassword' })
          .expect(401);
      });

      it('should enforce maximum of 5 active sessions', async () => {
        for (let i = 0; i < 6; i++) {
          await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send(loginDto)
            .expect(201);
        }

        const user = await prisma.user.findUnique({ where: { email: loginDto.email } });
        const activeSessions = await prisma.refreshToken.findMany({
          where: { userId: user!.id, revokedAt: null },
        });

        expect(activeSessions.length).toBe(5);
      });
    });

    describe('POST /refresh', () => {
      let refreshTokenCookie: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto);

        const cookies = response.headers['set-cookie'];
        if (Array.isArray(cookies)) {
          refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
        }
      });

      it('should refresh token using cookie', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .set('Cookie', [refreshTokenCookie])
          .expect(201);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).not.toHaveProperty('refreshToken');
        expect(response.headers['set-cookie']).toBeDefined();
      });

      it('should fail without cookie', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .expect(401);
      });
    });

    describe('POST /logout', () => {
      let refreshTokenCookie: string;
      let accessToken: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto);

        const cookies = response.headers['set-cookie'];
        if (Array.isArray(cookies)) {
          refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
        }
        accessToken = response.body.accessToken;
      });

      it('should logout successfully', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/logout')
          .set('Cookie', [refreshTokenCookie])
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(201);
      });
    });
  });
});
