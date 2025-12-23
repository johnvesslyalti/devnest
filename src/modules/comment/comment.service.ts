import { cacheKeys } from "../../utils/cacheKeys";
import { redis } from "../../utils/redis";
import { commentRepository } from "./comment.repository"

const COMMENTS_TTL = 45;

export const commentService = {
    create: async (userId: string, postId: string, content: string) => {
        const comment = await commentRepository.create(userId, postId, content);

        await redis.del(
            cacheKeys.commentsByPost(postId, 1, 10)
        );

        await redis.incr(
            cacheKeys.commentCount(postId)
        );

        return comment
    },

    findByPost: async (postId: string, page = 1, limit = 10) => {
        const cacheKey = cacheKeys.commentsByPost(postId, page, limit);

        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached)
        }

        const comments = await commentRepository.findByPost(
            postId,
            page,
            limit
        );

        await redis.set(
            cacheKey,
            JSON.stringify(comments),
            "EX",
            COMMENTS_TTL
        )
    }
}