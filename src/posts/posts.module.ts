import { Module } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { PostsController } from "./posts.controller";
import { PostsRepository } from "./posts.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { FeedModule } from "../feed/feed.module";

@Module({
  imports: [PrismaModule, PrismaModule, FeedModule],
  controllers: [PostsController],
  providers: [PostsService, PostsRepository],
})
export class PostsModule {}
