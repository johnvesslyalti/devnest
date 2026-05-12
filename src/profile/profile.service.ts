import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ProfileRepository } from "./profile.repository";

@Injectable()
export class ProfileService {
  constructor(
    private profileRepository: ProfileRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getPublicProfile(identifier: string) {
    const cacheKey = `profile:public:${identifier}`;
    const cachedProfile = await this.cacheManager.get(cacheKey);

    if (cachedProfile) {
      return cachedProfile;
    }

    const profile = await this.profileRepository.findUserPublicData(identifier);

    if (profile) {
      await this.cacheManager.set(cacheKey, profile, 600000); // 10 minutes
    }

    return profile;
  }

  async findUser(identifier: string, currentUserId?: string) {
    const profile: any = await this.getPublicProfile(identifier);

    if (!profile) return null;

    let isFollowing = false;

    if (currentUserId) {
      isFollowing = await this.profileRepository.checkIsFollowing(
        profile.id,
        currentUserId,
      );
    }

    if (!profile) return null;

    return {
      ...profile,
      isFollowing,
      followers: undefined,
    };
  }

  async searchUsers(query: string) {
    if (!query || query.length < 2) return [];

    return this.profileRepository.searchUsersMinimal(query);
  }

  async updateBio(userId: string, bio: string) {
    const updatedUser = await this.profileRepository.updateUserBio(userId, bio);

    // Invalidate cache for both ID and username
    await this.cacheManager.del(`profile:public:${updatedUser.id}`);
    await this.cacheManager.del(`profile:public:${updatedUser.username}`);

    return updatedUser;
  }
}
