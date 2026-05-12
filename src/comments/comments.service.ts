import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { CommentsRepository } from "./comments.repository";

@Injectable()
export class CommentsService {
  constructor(
    private commentsRepository: CommentsRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(userId: string, postId: string, content: string) {
    const comment = await this.commentsRepository.create({
      userId,
      postId,
      content,
    });

    // Invalidate cache by updating the version key
    await this.cacheManager.set(
      `comments_version:${postId}`,
      Date.now(),
      86400000,
    ); // 24 hours

    return comment;
  }

  async findByPost(postId: string, cursor?: string, limit = 20) {
    let version = await this.cacheManager.get<number>(
      `comments_version:${postId}`,
    );
    if (!version) {
      version = Date.now();
      await this.cacheManager.set(
        `comments_version:${postId}`,
        version,
        86400000,
      );
    }

    const cacheKey = `comments:${postId}:v${version}:${cursor || "start"}:${limit}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const comments = await this.commentsRepository.findByPost(
      postId,
      cursor,
      limit,
    );

    const hasMore = comments.length === limit;
    const nextCursor = hasMore ? comments[comments.length - 1].id : null;
    const result = { data: comments, nextCursor };

    await this.cacheManager.set(cacheKey, result, 30000); // 30 seconds

    return result;
  }
}
