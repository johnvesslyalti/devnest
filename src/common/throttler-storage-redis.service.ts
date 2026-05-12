import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ThrottlerStorageRedisService
  implements ThrottlerStorage, OnModuleDestroy
{
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisUrlStr =
      this.configService.get<string>("REDIS_URL") || "redis://localhost:6379";
    const isUpstash = redisUrlStr.includes("upstash.io");
    const isTls = redisUrlStr.startsWith("rediss://") || isUpstash;
    this.redis = new Redis(
      redisUrlStr,
      isTls ? { tls: { rejectUnauthorized: false } } : {},
    );
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    const script = `
      local key = KEYS[1]
      local ttl = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      
      local current = redis.call("INCR", key)
      if current == 1 then
        redis.call("EXPIRE", key, ttl)
      end
      
      local ttlRemaining = redis.call("TTL", key)
      
      return {current, ttlRemaining}
    `;

    const result = (await this.redis.eval(
      script,
      1,
      key,
      ttlSeconds,
      limit,
    )) as [number, number];
    const totalHits = result[0];
    const timeToExpire = Math.max(0, result[1]);

    return {
      totalHits,
      timeToExpire: timeToExpire * 1000,
      isBlocked: totalHits > limit,
      timeToBlockExpire: 0, // Not implementing specific block expiry logic for now
    };
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
