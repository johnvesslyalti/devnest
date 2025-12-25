import { postRepo } from "./post.repository";
import { redis } from "../../utils/redis";
import { cacheKeys } from "../../utils/cacheKeys";

export const postService = {
  // -------------------- CREATE POST --------------------
  async create(authorId: string, content: string) {
    const post = await postRepo.create(authorId, content);

    // Best-effort invalidation (do NOT depend on relations)
    await Promise.all([
      redis.del(cacheKeys.posts(1, 20)),                 // public feed
      redis.del(cacheKeys.feed(authorId, 20)),           // home feed
    ]);

    return post;
  },

  // -------------------- GET SINGLE POST --------------------
  async findOne(postId: string) {
    const postKey = cacheKeys.postById(postId);
    const likeCountKey = cacheKeys.likeCountByPost(postId);
    const commentCountKey = cacheKeys.commentCount(postId);

    // 1️⃣ Cache first
    const cached = await redis.get(postKey);
    if (cached) {
      const post = JSON.parse(cached);

      const [likes, comments] = await Promise.all([
        redis.get(likeCountKey),
        redis.get(commentCountKey),
      ]);

      return {
        ...post,
        _count: {
          likes: likes ? Number(likes) : post._count?.likes ?? 0,
          comments: comments ? Number(comments) : post._count?.comments ?? 0,
        },
      };
    }

    // 2️⃣ DB fallback
    const post = await postRepo.findOne(postId);
    if (!post) return null;

    // 3️⃣ Cache immutable post data
    await redis.set(postKey, JSON.stringify(post), "EX", 600);

    // 4️⃣ Prime counts once
    if (post._count) {
      await Promise.all([
        redis.setnx(likeCountKey, String(post._count.likes)),
        redis.setnx(commentCountKey, String(post._count.comments)),
      ]);
    }

    return post;
  },

  // -------------------- POSTS BY USER --------------------
  async findByUserName(username: string, page = 1, limit = 20) {
    const key = cacheKeys.postsByUser(username, page, limit);

    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const posts = await postRepo.findByUserName(username);

    await redis.set(key, JSON.stringify(posts), "EX", 300);

    return posts;
  },

  // -------------------- PUBLIC FEED --------------------
  async findPublicFeed(page = 1, limit = 20) {
    const key = cacheKeys.posts(page, limit);

    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const posts = await postRepo.findPublicFeed();

    await redis.set(key, JSON.stringify(posts), "EX", 60);

    return posts;
  },
};
