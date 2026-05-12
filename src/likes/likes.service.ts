import { Injectable } from "@nestjs/common";
import { LikesRepository } from "./likes.repository";

@Injectable()
export class LikesService {
  constructor(private likesRepository: LikesRepository) {}

  async like(userId: string, postId: string) {
    return this.likesRepository.create({
      userId,
      postId,
    });
  }

  async unlike(userId: string, postId: string) {
    return this.likesRepository.delete(userId, postId);
  }
}
