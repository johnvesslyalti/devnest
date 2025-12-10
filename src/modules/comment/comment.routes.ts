import { Router } from "express";
import { commentController } from "./comment.controller";

const router = Router()

router.post("/", commentController.create);
router.get("/", commentController.findByPost)

export default router