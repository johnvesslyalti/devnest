import { postRepo } from "./post.repository";

export const postService = {
    create: (authorId: string, content: string) =>
        postRepo.create(authorId, content),

    findByUserName: (username: string) => postRepo.findByUserName(username),

    findOne: (id: string) => postRepo.findOne(id),
}