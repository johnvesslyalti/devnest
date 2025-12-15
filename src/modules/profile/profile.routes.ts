import { Router } from "express";
import { profileController } from "./profile.controller";
import { auth } from "../../middlewares/auth";

const router = Router();

router.get("/:username", profileController.findUserByName);
router.patch("/:username", auth.verifyAccessToken, profileController.updateUserBio)

export default router;