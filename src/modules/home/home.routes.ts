import { Router } from "express";
import { homeController } from "./home.controller";

const router = Router()

router.post("/home", homeController.findAllPosts)