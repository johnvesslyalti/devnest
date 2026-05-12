import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";
import { FeedRepository } from "./feed.repository";
import { FeedFanoutProcessor } from "./feed.fanout.processor";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: "feed-fanout",
      forceDisconnectOnShutdown: true,
    }),
    BullBoardModule.forFeature({
      name: "feed-fanout",
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository, FeedFanoutProcessor],
  exports: [FeedService],
})
export class FeedModule {}
