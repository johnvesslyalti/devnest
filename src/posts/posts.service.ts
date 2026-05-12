import { Injectable } from "@nestjs/common";
import { PostsRepository } from "./posts.repository";
import { FeedService } from "../feed/feed.service";

@Injectable()
export class PostsService {
  constructor(
    private postsRepository: PostsRepository,
    private feedService: FeedService,
  ) {}

  async create(authorId: string, content: string, imageUrl?: string) {
    const post = await this.postsRepository.create({
      authorId,
      content,
      imageUrl,
    });

    // Background Fan-out (Push model)
    await this.feedService.dispatchFanout(post);

    return post;
  }

  async findByUserName(username: string) {
    return this.postsRepository.findByUserName(username);
  }

  async findOne(id: string) {
    return this.postsRepository.findOne(id);
  }

  async findPublicFeed(cursor?: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    return this.postsRepository.findPublicFeed(take, cursor);
  }
}
