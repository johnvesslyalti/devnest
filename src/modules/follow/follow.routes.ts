import { Router } from "express";
import { followController } from "./follow.controller";

const router = Router();

router.post("/", followController.follow);
router.delete("/", followController.unfollow);

export default router;