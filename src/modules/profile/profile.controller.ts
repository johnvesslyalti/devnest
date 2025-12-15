import { Request, Response } from "express";
import { profileService } from "./profile.service";
import { AuthRequest } from "../../types/express";

export const profileController = {
    findUserByName: async (req: Request, res: Response) => {
        try {
            const { username } = req.params;

            if (!username) {
                return res.status(400).json({ message: "Username is required" });
            }

            const user = await profileService.findUserByName(username);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            return res.status(200).json(user);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    updateUserBio: async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            const { bio } = req.body;

            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            if (!bio || typeof bio !== "string") {
                return res.status(400).json({ message: "Bio is required" });
            }

            if (bio.length > 160) {
                return res.status(400).json({ message: "Bio too long" });
            }

            const updatedUser = await profileService.updateUserBio(userId, bio.trim());

            return res.status(200).json(updatedUser);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
};
