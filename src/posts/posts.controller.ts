import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import { PostsService } from "./posts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";

import { CreatePostDto } from "./dto/create-post.dto";

@UseGuards(ThrottlerGuard)
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() body: CreatePostDto) {
    const post = await this.postsService.create(req.user.id, body.content);
    return { message: "Post created", post };
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000) // 1 minute
  @Get("user/:username")
  async findByUserName(@Param("username") username: string) {
    return this.postsService.findByUserName(username);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000) // 1 minute
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.postsService.findOne(id);
  }

  // Add endpoint for public feed if not covered by home module
  // Existing app has "home" module for feed, but postRepo has findPublicFeed.
  // We can expose it here or keep it for HomeModule.
  // The user migration plan mentioned "Migrate Posts Module".
  // Let's keep public feed here for now or standard findAll?
  // Let's add it as generic GET /, but maybe that conflicts with findOne /:id?
  // No, GET / is fine.
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds for feed
  @Get()
  async findAll(
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.postsService.findPublicFeed(cursor, parsedLimit);
  }
}
