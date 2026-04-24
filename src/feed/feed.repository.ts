import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Redis } from "ioredis";

@Injectable()
export class FeedRepository {
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // Get the underlying ioredis client from cache-manager
    const cacheAny = this.cacheManager as any;
    const store = cacheAny.store || (cacheAny.stores && cacheAny.stores[0]);
    if (store && store.client) {
      this.redis = store.client;
    } else if (store && store.instance) {
      this.redis = store.instance;
    }
  }

  async findByUserId(userId: string, take: number = 20, cursor?: string) {
    const feedKey = `feed:user:${userId}`;
    let postIds: string[] = [];

    // 1. Try to fetch post IDs from Redis (Push Model)
    if (this.redis) {
      if (cursor) {
        // Fetch from cursor using score (timestamp)
        const cursorPost = await this.prisma.post.findUnique({
          where: { id: cursor },
          select: { createdAt: true },
        });

        if (cursorPost) {
          const score = new Date(cursorPost.createdAt).getTime();
          // ZREVRANGEBYSCORE key (score-1) -inf LIMIT 0 take+1
          postIds = await this.redis.zrevrangebyscore(
            feedKey,
            score - 1,
            "-inf",
            "LIMIT",
            0,
            take + 1,
          );
        }
      } else {
        // Fetch first page
        postIds = await this.redis.zrevrange(feedKey, 0, take);
      }
    }

    // 2. Fallback to Pull Model if Redis is empty or missing
    if (postIds.length === 0) {
      return this.fallbackPullModel(userId, take, cursor);
    }

    // 3. Hydrate IDs from Database
    const hasNextPage = postIds.length > take;
    const idsToFetch = hasNextPage ? postIds.slice(0, take) : postIds;

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: idsToFetch },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: {
            userId: userId,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    // Re-sort hydrated posts to match Redis order (descending scores)
    const sortedPosts = idsToFetch
      .map((id) => posts.find((p) => p.id === id))
      .filter((p) => !!p);

    const nextCursor = hasNextPage
      ? sortedPosts[sortedPosts.length - 1].id
      : null;

    return { items: sortedPosts, nextCursor };
  }

  private async fallbackPullModel(
    userId: string,
    take: number = 20,
    cursor?: string,
  ) {
    const cursorPost = cursor
      ? await this.prisma.post.findUnique({
          where: { id: cursor },
          select: { id: true, createdAt: true },
        })
      : null;

    if (cursor && !cursorPost) {
      return { items: [], nextCursor: null };
    }

    const posts = await this.prisma.post.findMany({
      take: take + 1,
      where: {
        author: {
          followers: {
            some: {
              followerId: userId,
            },
          },
        },
        ...(cursorPost && {
          OR: [
            { createdAt: { lt: cursorPost.createdAt } },
            {
              AND: [
                { createdAt: cursorPost.createdAt },
                { id: { lt: cursorPost.id } },
              ],
            },
          ],
        }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: {
            userId: userId,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    const hasNextPage = posts.length > take;
    const items = hasNextPage ? posts.slice(0, take) : posts;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    // Optional: Warm up the Redis feed if this is the first page
    if (!cursor && items.length > 0 && this.redis) {
      const pipeline = this.redis.pipeline();
      items.forEach((p) => {
        pipeline.zadd(
          `feed:user:${userId}`,
          new Date(p.createdAt).getTime(),
          p.id,
        );
      });
      await pipeline.exec();
    }

    return { items, nextCursor };
  }
}
