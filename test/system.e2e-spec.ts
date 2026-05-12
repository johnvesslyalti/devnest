import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ValidationPipe } from '../src/common/pipes/validation.pipe';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import Redis from 'ioredis';
import { AuthService } from '../src/auth/auth.service';
import { getTestDbUrl, getTestRedisUrl } from './utils/config';

describe('System Features (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    process.env.POSTGRES_URL = getTestDbUrl();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    
    // Clean DB
    await prisma.user.deleteMany();
    await prisma.post.deleteMany();

    await prisma.post.deleteMany();

    // Register a user
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'System Feature User',
        username: 'sysfeatures',
        email: 'sysfeatures@example.com',
        password: 'password123',
      });

    if (!res.body.user) {
      console.error('Registration failed:', res.body);
    }

    userToken = res.body.accessToken;
    userId = res.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean Redis to reset rate limits before each test
    const redis = new Redis(getTestRedisUrl());
    await redis.flushall();
    redis.disconnect();
  });

  describe('1. Rate Limiting Test', () => {
    it('should return 429 Too Many Requests after hitting limit (10 hits/min)', async () => {
      // The app module is configured with: limit: 10, ttl: 60000
      let lastStatus = 200;
      // We need to hit it 11 times. The first 10 will be 200, 11th should be 429.
      for (let i = 0; i < 11; i++) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/posts')
          .set('Authorization', `Bearer ${userToken}`);
        
        lastStatus = response.status;
      }

      expect(lastStatus).toBe(429);
    });
  });

  describe('2. Soft Delete Test', () => {
    it('should soft delete user and revoke all refresh tokens', async () => {
      // Create an active session specific to this test
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'sysfeatures@example.com',
          password: 'password123',
        });
      const setCookieRaw = res.headers['set-cookie'];
      let sessionToken: string | undefined;

      if (setCookieRaw && setCookieRaw.length > 0) {
        const match = setCookieRaw[0].match(/refreshToken=([^;]+)/);
        if (match) {
          sessionToken = match[1];
        }
      }

      if (!sessionToken) {
        console.error('Login failed / no refresh token in cookies:', res.headers, res.body);
      }
      expect(sessionToken).toBeDefined();

      // Soft delete the user via Auth service (Normally done via a DELETE /users/me endpoint, we'll hit DB directly for test auth service logic)
      const authService = app.get(AuthService);
      await authService.softDelete(userId);

      // Verify User deletedAt is set
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user.deletedAt).toBeDefined();

      // Verify associated tokens are revoked
      const tokens = await prisma.refreshToken.findMany({ where: { userId } });
      expect(tokens.length).toBeGreaterThan(0);
      for (const t of tokens) {
        expect(t.revokedAt).toBeDefined();
      }
    });
  });

  describe('3. Cursor Pagination Test', () => {
    it('should correctly paginate posts using cursor', async () => {
      // We need another user and some posts since the first user is soft-deleted
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Paginator User',
          username: 'paginator',
          email: 'paginator@example.com',
          password: 'password123',
        });
      
      const newUserId = res.body.id;
      const paginatorToken = res.body.accessToken;

      // Manually drop 3 posts in the database, sequentially delayed to ensure sorting
      for (let i = 0; i < 3; i++) {
        await prisma.post.create({
          data: {
            content: `Post number ${i}`,
            authorId: newUserId,
            // We manually set createdAt slightly apart to guarantee ordering
            createdAt: new Date(Date.now() - (10 - i) * 1000)
          }
        });
      }

      // 1. Fetch first page (limit 2)
      const page1Res = await request(app.getHttpServer()).get('/api/v1/posts?limit=2').set('Authorization', `Bearer ${paginatorToken}`);
      expect(page1Res.status).toBe(200);
      expect(page1Res.body.items).toBeDefined();
      expect(page1Res.body.items.length).toBe(2);
      expect(page1Res.body.nextCursor).toBeDefined();

      const nextCursor = page1Res.body.nextCursor;

      // 2. Fetch second page with cursor
      const page2Res = await request(app.getHttpServer()).get(`/api/v1/posts?limit=2&cursor=${encodeURIComponent(nextCursor)}`).set('Authorization', `Bearer ${paginatorToken}`);
      expect(page2Res.status).toBe(200);
      expect(page2Res.body.items).toBeDefined();

      const page1Ids = page1Res.body.items.map((p: any) => p.id);
      const page2Ids = page2Res.body.items.map((p: any) => p.id);

      expect(page1Ids.includes(page2Ids[0])).toBe(false);
    });
  });
});
