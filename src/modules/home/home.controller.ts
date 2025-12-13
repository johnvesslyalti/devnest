import { Response } from "express"
import { homeService } from "./home.service"

export const homeController = {
    async findAllPosts(res: Response) {
        const posts = await homeService.findPosts()

        res.json({ message: "Success", posts })
    }
}