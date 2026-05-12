import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/app';
import { getTestDbUrl } from './utils/config';
import { migrateDb, resetDb, seedTestData, SeededData } from './utils/db';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Posts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seed: SeededData;

  beforeAll(async () => {
    process.env.POSTGRES_URL = getTestDbUrl();
    migrateDb();
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    seed = await seedTestData(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Happy-path ────────────────────────────────────────────────

  describe('POST /api/v1/posts', () => {
    it('should create a post when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .send({ content: 'My first post' })
        .expect(201);

      expect(res.body).toHaveProperty('message', 'Post created');
      expect(res.body.post).toHaveProperty('id');
      expect(res.body.post).toHaveProperty('content', 'My first post');
    });
  });

  describe('GET /api/v1/posts/:id', () => {
    it('should return a single post with author and counts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${seed.postByB.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', seed.postByB.id);
      expect(res.body).toHaveProperty('content', seed.postByB.content);
      expect(res.body).toHaveProperty('author');
      expect(res.body.author).toHaveProperty('username', 'userb');
      expect(res.body).toHaveProperty('_count');
    });
  });

  describe('GET /api/v1/posts/user/:username', () => {
    it('should return posts by a given username', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/user/userb')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].author.username).toBe('userb');
    });

    it('should return empty array for soft-deleted user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/user/deleteduser')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/posts (public feed)', () => {
    it('should return posts and exclude soft-deleted authors', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      const authorUsernames = res.body.items.map((p: any) => p.author.username);
      expect(authorUsernames).toContain('userb');
      expect(authorUsernames).not.toContain('deleteduser');
    });
  });

  // ── Negative tests ────────────────────────────────────────────

  describe('POST /api/v1/posts — negative', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .send({ content: 'No auth' })
        .expect(401);
    });

    it('should return 400 for empty content', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .send({ content: '' })
        .expect(400);
    });

    it('should return 400 for missing content field', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .send({})
        .expect(400);
    });
  });
});
