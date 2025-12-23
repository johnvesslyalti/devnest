import { Request, Response } from "express";
import { commentInput } from "./comment.schema";
import { commentService } from "./comment.service";

export const commentController = {
    create: async (req: Request<{}, {}, commentInput>, res: Response) => {

        const userId = req.user?.id
        if (!userId) {
            return res.status(401).json({ message: "User not allowed" })
        }

        const { postId, content } = req.body;

        const comment = await commentService.create(userId, postId, content)

        res.json({ message: "comment added", comment })
    },

    async findByPost(req: Request, res: Response) {
        const { postId } = req.params;

        const comments = await commentService.findByPost(postId);

        res.json(comments);
    }
}