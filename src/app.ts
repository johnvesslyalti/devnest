import express from "express"
import authRoutes from "./modules/auth/auth.routes"
import { auth } from "./middlewares/auth"
import postRoutes from "./modules/post/post.routes"
import likeRoutes from "./modules/like/like.routes"
import commentRoutes from "./modules/comment/comment.routes"
import homeRoutes from "./modules/home/home.routes"

const app = express()
app.use(express.json())

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/likes", auth.verifyAccessToken, likeRoutes);
app.use("/api/v1/comments", auth.verifyAccessToken, commentRoutes);
app.use("/api/v1/home", homeRoutes)

app.get("/health", (_, res) => {
    res.send("OK");
});

export default app;