import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/app';
import { getTestDbUrl } from './utils/config';
import { migrateDb, resetDb, seedTestData, SeededData } from './utils/db';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Likes (e2e)', () => {
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

  describe('POST /api/v1/posts/:postId/like', () => {
    it('should like a post', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/like`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .expect(201);

      expect(res.body).toHaveProperty('message', 'Post liked');
    });
  });

  describe('DELETE /api/v1/posts/:postId/like', () => {
    it('should unlike a previously liked post', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/like`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .expect(201);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/posts/${seed.postByB.id}/like`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Post unliked');
    });
  });

  // ── Negative tests ────────────────────────────────────────────

  describe('POST /api/v1/posts/:postId/like — negative', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/like`)
        .expect(401);
    });

    it('should fail when liking the same post twice', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/like`)
        .set('Authorization', `Bearer ${seed.tokenA}`)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/posts/${seed.postByB.id}/like`)
        .set('Authorization', `Bearer ${seed.tokenA}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('DELETE /api/v1/posts/:postId/like — negative', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${seed.postByB.id}/like`)
        .expect(401);
    });

    it('should fail when unliking a post not previously liked', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/posts/${seed.postByB.id}/like`)
        .set('Authorization', `Bearer ${seed.tokenA}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
