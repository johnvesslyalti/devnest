import { feedRepo } from "./feed.repository"

export const feedService = {
    async getHomeFeed(
        userid: string,
        limit: number,
        cursor?: string
    ) {
        const posts = await feedRepo.getFeed(userid, limit, cursor)

        const nextCursor =
            posts.length === limit
                ? posts[posts.length - 1].id
                : null

        return {
            items: posts,
            nextCursor
        }
    }
}