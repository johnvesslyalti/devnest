import { prisma } from "../../utils/prisma"

export const profileRepo = {
    findUserByName: (username: string) => {
        return prisma.user.findUnique({
            where: { username: username },
            select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                bio: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    }
                }
            }
        })
    },

    updateBio: (userId: string, bio: string) => {
        return prisma.user.update({
            where: { id: userId },
            data: { bio },
            select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                bio: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    }
                }
            }
        })
    }
}