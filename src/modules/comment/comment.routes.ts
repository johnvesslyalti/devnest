import { Router } from "express";
import { commentController } from "./comment.controller";

const router = Router()

router.post("/", commentController.create);
router.get("/:postId", commentController.findByPost)

export default router