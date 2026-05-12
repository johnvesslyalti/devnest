import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfileRepository {
  constructor(private prisma: PrismaService) {}

  async findUserPublicData(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });
  }

  async checkIsFollowing(
    profileId: string,
    currentUserId: string,
  ): Promise<boolean> {
    const followCheck = await this.prisma.user.findFirst({
      where: {
        id: profileId,
        followers: {
          some: {
            followerId: currentUserId,
          },
        },
      },
      select: { id: true },
    });
    return !!followCheck;
  }

  async searchUsers(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
      // Note: Original searchUsers service method selected fewer fields.
      // Keeping consistent with original logic but added count for consistency if needed later or just stick to original.
      // The original searchUsers selected: id, name, username, avatarUrl.
      // Let's stick to the original select for searchUsers to avoid over-fetching.
    });
  }

  async searchUsersMinimal(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
      },
    });
  }

  async updateUserBio(userId: string, bio: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { bio },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });
  }
}
