import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerStorageRedisService } from "./common/throttler-storage-redis.service";
import { ThrottlerStorageModule } from "./common/throttler-storage.module";
import { BullModule } from "@nestjs/bullmq";
import { RedisCacheModule } from "./common/cache/cache.module";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { ProfileModule } from "./profile/profile.module";
import { PostsModule } from "./posts/posts.module";
import { CommentsModule } from "./comments/comments.module";
import { LikesModule } from "./likes/likes.module";
import { LoggingMiddleware } from "./common/middleware/logging.middleware";

import { FeedModule } from "./feed/feed.module";
import { EmailModule } from "./email/email.module";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";

import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: ExpressAdapter,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrlStr =
          configService.get<string>("REDIS_URL") || "redis://localhost:6379";
        const isUpstash = redisUrlStr.includes("upstash.io");
        const redisUrl = new URL(redisUrlStr);
        return {
          connection: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port, 10) || 6379,
            username: redisUrl.username || undefined,
            password: redisUrl.password || undefined,
            db:
              redisUrl.pathname && redisUrl.pathname !== "/"
                ? parseInt(redisUrl.pathname.slice(1), 10)
                : undefined,
            tls:
              redisUrlStr.startsWith("rediss://") || isUpstash
                ? { rejectUnauthorized: false }
                : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [ThrottlerStorageRedisService],
      useFactory: (storage: ThrottlerStorageRedisService) => ({
        throttlers: [{ ttl: 60000, limit: 10 }],
        storage,
      }),
    }),
    PrismaModule,
    RedisCacheModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    FeedModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes("*");
  }
}
