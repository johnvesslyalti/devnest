import { Request, Response } from "express";
import { postService } from "./post.service";
import { AuthRequest } from "../../types/express";

export const postController = {
    async create(req: AuthRequest, res: Response) {
        const { content } = req.body;

        const authorId = req.user?.id;

        if (!authorId) {
            return res.status(401).json({ message: "User not authentication" })
        }

        const post = await postService.create(authorId, content);

        res.json({ message: "Post created", post })
    },

    async findByUserName(req: Request, res: Response) {

        const { username } = req.params;

        const posts = await postService.findByUserName(username);

        return res.json(posts);
    },

    async findOne(req: Request, res: Response) {
        const { id } = req.params;
        const post = await postService.findOne(id);
        res.json(post);
    }
}