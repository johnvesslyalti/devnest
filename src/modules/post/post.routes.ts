import { auth } from "../../middlewares/auth";
import { postController } from "./post.controller";
import { Router } from "express"

const router = Router()

router.post("/", auth.verifyAccessToken, postController.create)
router.get("/user/:username", postController.findByUserName)
router.get("/", postController.findOne)

export default router;