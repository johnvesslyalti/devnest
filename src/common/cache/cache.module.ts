import { Module, Global, Logger } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-yet";
import { CacheCleanupService } from "./cache-cleanup.service";

const logger = new Logger("RedisCacheModule");

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrlStr =
          configService.get<string>("REDIS_URL") || "redis://localhost:6379";
        const isUpstash = redisUrlStr.includes("upstash.io");
        const store = await redisStore({
          url: redisUrlStr,
          socket: {
            tls:
              redisUrlStr.startsWith("rediss://") || isUpstash ? true : false,
            rejectUnauthorized: false,
          },
          ttl: 600, // Default 10 minutes
        });

        // Prevent node-redis socket errors from crashing the Nest process.
        store.client.on("error", (error) => {
          logger.error(
            `Redis cache client error: ${error.message}`,
            error.stack,
          );
        });

        return {
          store,
        };
      },
    }),
  ],
  providers: [CacheCleanupService],
  exports: [CacheModule],
})
export class RedisCacheModule {}
