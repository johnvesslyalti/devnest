export const cacheKeys = {
  // -------------------- Profiles --------------------
  profileByUsername: (username: string) =>
    `profile:username:${username}`,

  profileByUserId: (userId: string) =>
    `profile:user:${userId}`,

  followers: (userId: string) =>
    `followers:${userId}`,

  following: (userId: string) =>
    `following:${userId}`,

  // -------------------- Posts --------------------

  // Single post (hot read)
  postById: (postId: string) =>
    `post:${postId}`,

  // Posts by user (profile page)
  postsByUser: (username: string, page: number, limit: number) =>
    `posts:user:${username}:page:${page}:limit:${limit}`,

  // Global posts (explore / latest)
  posts: (page: number, limit: number) =>
    `posts:page:${page}:limit:${limit}`,

  // Home feed (personalized)
  feed: (userId: string, limit: number, cursor?: string) =>
    `feed:home:user:${userId}:limit:${limit}:cursor:${cursor || "first"}`,

  // -------------------- Likes --------------------

  // Like count per post (VERY IMPORTANT)
  likeCountByPost: (postId: string) =>
    `likes:count:post:${postId}`,

  // Did user like a post? (short TTL only)
  userLikedPost: (userId: string, postId: string) =>
    `likes:user:${userId}:post:${postId}`,

  // -------------------- Comments --------------------

  commentsByPost: (
    postId: string,
    page: number,
    limit: number,
  ) =>
    `comments:post:${postId}:page:${page}:limit:${limit}`,

  commentCount: (postId: string) =>
    `comments:count:post:${postId}`,

  commentById: (commentId: string) =>
    `comment:${commentId}`,
};
