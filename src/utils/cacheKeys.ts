export const cacheKeys = {
    profileByUsername: (username: string) =>
        `profile:username:${username}`,

    profileByUserId: (userId: string) =>
        `profile:user:${userId}`,

    followers: (userId: string) =>
        `followers:${userId}`,

    following: (userId: string) =>
        `following:${userId}`,

    posts: (page: number, limit: number) =>
        `posts:page:${page}:limit:${limit}`,

    feed: (userId: string, limit: number, cursor?: string) =>
        `feed:home:user:${userId}:limit:${limit}:cursor:${cursor || "first"}`,

    // Comments

    commentsByPost: (
        postId: string,
        page: number,
        limit: number,
    ) =>
        `comments:post:${postId}:page:${page}:limit:${limit}`,

    commentCount: (postId: string) =>
        `comments:count:post:${postId}`,

    commentById: (commentId: string) =>
        `comment:${commentId}`
}