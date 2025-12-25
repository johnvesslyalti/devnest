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
                        avatarUrl: true,
                    },
                },
                _count: { select: { likes: true, comments: true } }
            },
            orderBy: { createdAt: "desc" },
        })
    },

    findOne(id: string) {
        return prisma.post.findUnique({
            where: { id },
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
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        })
    },

    findPublicFeed(cursor?: string) {
        return prisma.post.findMany({
            take: 20,
            ...(cursor && {
                skip: 1,
                cursor: { id: cursor }
            }),
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                content: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
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