import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/app';
import { getTestDbUrl } from './utils/config';
import { migrateDb, resetDb, seedTestData, SeededData } from './utils/db';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Comments (e2e)', () => {
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

  describe('POST /api/v1/posts/:postId/comments', () => {
    it('should add a comment to a post', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/comments`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .send({ content: 'Great post!' })
        .expect(201);

      expect(res.body).toHaveProperty('message', 'Comment added');
      expect(res.body.comment).toHaveProperty('id');
      expect(res.body.comment).toHaveProperty('content', 'Great post!');
      expect(res.body.comment).toHaveProperty('user');
      expect(res.body.comment.user).toHaveProperty('username', 'usera');
    });
  });

  describe('GET /api/v1/posts/:postId/comments', () => {
    it('should return comments for a post', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/comments`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .send({ content: 'Comment 1' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${seed.postByB.id}/comments`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]).toHaveProperty('content', 'Comment 1');
      expect(res.body.data[0]).toHaveProperty('user');
    });

    it('should paginate comments', async () => {
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post(`/api/v1/posts/${seed.postByB.id}/comments`)
          .set('Authorization', `Bearer ${seed.tokenA}`)
          .send({ content: `Comment ${i}` })
          .expect(201);
      }

      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${seed.postByB.id}/comments?page=1&limit=2`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body).toHaveProperty('nextCursor');
    });
  });

  // ── Negative tests ────────────────────────────────────────────

  describe('POST /api/v1/posts/:postId/comments — negative', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/comments`)
        .send({ content: 'No auth comment' })
        .expect(401);
    });

    it('should return 400 for empty content', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/comments`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .send({ content: '' })
        .expect(400);
    });

    it('should return 400 for missing content field', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/comments`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .send({})
        .expect(400);
    });
  });
});
