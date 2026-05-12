import { execSync } from 'child_process';
import { PrismaService } from '../../src/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export const migrateDb = () => {
    if (process.env.CI) {
        return;
    }
    try {
        execSync('npx prisma db push --schema=./prisma/postgres/schema.prisma --accept-data-loss', { 
            env: {
                ...process.env,
                POSTGRES_URL: process.env.POSTGRES_URL
            },
            stdio: 'inherit' 
        });
    } catch (e) {
        console.error('Error migrating database:', e);
        throw e;
    }
};

export const resetDb = async (prisma: PrismaService) => {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename::text FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
};

/**
 * Registers a user through the API and returns tokens + user info.
 */
const registerUser = async (
  app: INestApplication,
  data: { name: string; username: string; email: string; password: string },
) => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(data)
    .expect(201);

  const cookies = res.headers['set-cookie'];
  let refreshTokenCookie = '';
  if (Array.isArray(cookies)) {
    refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken=')) || '';
  }

  return {
    accessToken: res.body.accessToken as string,
    refreshTokenCookie,
  };
};

export interface SeededData {
  tokenA: string;
  tokenB: string;
  userAId: string;
  userBId: string;
  softDeletedUserId: string;
  postByB: { id: string; content: string };
}

/**
 * Seeds deterministic test data:
 *  - userA, userB (registered via API with valid JWTs)
 *  - softDeletedUser (created via Prisma with deletedAt set)
 *  - A follow: userA follows userB
 *  - A post by userB
 */
export const seedTestData = async (
  app: INestApplication,
  prisma: PrismaService,
): Promise<SeededData> => {
  // Register userA
  const { accessToken: tokenA } = await registerUser(app, {
    name: 'User A',
    username: 'usera',
    email: 'usera@test.com',
    password: 'password123',
  });

  // Register userB
  const { accessToken: tokenB } = await registerUser(app, {
    name: 'User B',
    username: 'userb',
    email: 'userb@test.com',
    password: 'password123',
  });

  // Look up the created user IDs
  const userA = await prisma.user.findUnique({ where: { username: 'usera' } });
  const userB = await prisma.user.findUnique({ where: { username: 'userb' } });

  if (!userA || !userB) throw new Error('Seed: users not found after registration');

  // Create soft-deleted user
  const softDeletedUser = await prisma.user.create({
    data: {
      name: 'Deleted User',
      username: 'deleteduser',
      email: 'deleted@test.com',
      password: 'hashed_irrelevant',
      deletedAt: new Date(),
    },
  });

  // Create a post by soft-deleted user (to verify it's filtered out)
  await prisma.post.create({
    data: {
      content: 'Post by deleted user',
      authorId: softDeletedUser.id,
    },
  });

  // userA follows userB (for feed tests)
  await prisma.follow.create({
    data: {
      followerId: userA.id,
      followingId: userB.id,
    },
  });

  // Create a post by userB
  const postByB = await prisma.post.create({
    data: {
      content: 'Hello from User B!',
      authorId: userB.id,
    },
  });

  return {
    tokenA,
    tokenB,
    userAId: userA.id,
    userBId: userB.id,
    softDeletedUserId: softDeletedUser.id,
    postByB: { id: postByB.id, content: postByB.content },
  };
};
