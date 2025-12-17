import { Request, Response } from "express";
import { feedService } from "./feed.service";

export const feedController = {
    async getHomeFeed(req: Request, res: Response) {
        const userId = req.user!.id

        const limit = Math.min(
            Number(req.query.limit) || 10,
            50
        )

        const cursor = req.query.cursor as string | undefined

        const feed = await feedService.getHomeFeed(
            userId,
            limit,
            cursor
        )

        return res.status(200).json({
            success: true,
            ...feed
        })
    }
}