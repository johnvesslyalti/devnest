import express from "express"
import authRoutes from "./modules/auth/auth.routes"
import { auth } from "./middlewares/auth"
import postRoutes from "./modules/post/post.routes"
import likeRoutes from "./modules/like/like.routes"
import commentRoutes from "./modules/comment/comment.routes"


const app = express()
app.use(express.json())

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", auth.verifyToken, postRoutes);
app.use("/api/v1/likes", auth.verifyToken, likeRoutes);
app.use("/api/v1/comments", auth.verifyToken, commentRoutes);


export default app;
