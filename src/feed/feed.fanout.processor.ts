import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Redis } from "ioredis";

@Injectable()
@Processor("feed-fanout")
export class FeedFanoutProcessor extends WorkerHost {
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super();
    // In cache-manager v5+, store might be in 'stores' or 'store'
    const cacheAny = this.cacheManager as any;
    const store = cacheAny.store || (cacheAny.stores && cacheAny.stores[0]);
    if (store && store.client) {
      this.redis = store.client;
    } else if (store && store.instance) {
      this.redis = store.instance;
    }
  }

  async process(
    job: Job<{ postId: string; authorId: string; createdAt: number }>,
  ): Promise<any> {
    const { postId, authorId, createdAt } = job.data;

    // 1. Fetch all followers of the author
    const followers = await this.prisma.follow.findMany({
      where: { followingId: authorId },
      select: { followerId: true },
    });

    if (followers.length === 0) {
      return { followersCount: 0 };
    }

    // 2. Add the postId to each follower's pre-computed feed (Redis ZSET)
    // Key: feed:user:{followerId}
    // Score: createdAt (timestamp)
    // Value: postId

    // We use pipeline for efficiency
    if (this.redis) {
      const pipeline = this.redis.pipeline();

      followers.forEach((f) => {
        const feedKey = `feed:user:${f.followerId}`;
        // ZADD key score member
        pipeline.zadd(feedKey, createdAt, postId);
        // Limit feed size to 500 items per user to save memory
        pipeline.zremrangebyrank(feedKey, 0, -501);
      });

      await pipeline.exec();
    }

    return { followersCount: followers.length };
  }
}
