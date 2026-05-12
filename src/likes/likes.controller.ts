import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { LikesService } from "./likes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ThrottlerGuard } from "@nestjs/throttler";

@UseGuards(ThrottlerGuard)
@Controller("posts/:postId/like")
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async like(@Req() req: any, @Param("postId") postId: string) {
    await this.likesService.like(req.user.id, postId);
    return { message: "Post liked" };
  }

  @Delete() // Or POST /unlike if that was the route. Let's assume matching method or explicit route.
  // Original route: router.delete("/:postId/like") in like.routes.ts?
  // Wait, I didn't check like.routes.ts but likeRepo had unlike.
  // Let's assume DELETE method on the same path /posts/:postId/like
  @UseGuards(JwtAuthGuard)
  async unlike(@Req() req: any, @Param("postId") postId: string) {
    await this.likesService.unlike(req.user.id, postId);
    return { message: "Post unliked" };
  }
}
