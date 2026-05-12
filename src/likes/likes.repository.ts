import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Like, Prisma } from "@internal/postgres-client";

@Injectable()
export class LikesRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.LikeUncheckedCreateInput): Promise<Like> {
    return this.prisma.like.create({
      data,
    });
  }

  async delete(userId: string, postId: string) {
    return this.prisma.like.delete({
      where: { userId_postId: { userId, postId } },
    });
  }
}
