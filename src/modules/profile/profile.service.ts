import { profileRepo } from "./profile.repository"

export const profileService = {
    findUserByName: (username: string) => profileRepo.findUserByName(username),

    updateUserBio: (userId: string, bio: string) => profileRepo.updateBio(userId, bio)
}