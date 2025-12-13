import { prisma } from "../../utils/prisma"

export const postRepo = {
    create: (authorId: string, content: string) => {
        return prisma.post.create({
            data: { authorId, content }
        });
    },

    findByUserName: (username: string) => {
        return prisma.post.findMany({
            where: {
                author: {
                    username: username
                }
            },
            select: {
                id: true,
                content: true,
                createdAt: true,

                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                _count: { select: { likes: true, comments: true } }
            },
            orderBy: { createdAt: "desc" },
        })
    },

    findOne: (id: string) => {
        return prisma.post.findUnique({
            where: { id },
            include: { author: true }
        })
    },

    findPublicFeed() {
        return prisma.post.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                content: true,
                createdAt: true,

                author: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        })
    }
}