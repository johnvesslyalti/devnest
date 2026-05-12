import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "./prisma/prisma.module";
import { EmailWorkerModule } from "./email/email.worker.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
    EmailWorkerModule,
  ],
})
export class WorkerModule {}
