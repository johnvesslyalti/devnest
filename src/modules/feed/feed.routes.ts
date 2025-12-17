import { Router } from "express";
import { feedController } from "./feed.controller";

const router = Router()

router.get(
    "/feed",
    feedController.getHomeFeed
)

export default router;
