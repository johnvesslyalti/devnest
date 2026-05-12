import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Query,
  UseGuards,
} from "@nestjs/common";
import { FeedService } from "./feed.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("feed")
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getFeed(
    @Req() req,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 20;
    return this.feedService.getFeed(req.user.id, take, cursor);
  }

  // Test endpoint to dispatch fan-out manually
  @UseGuards(JwtAuthGuard)
  @Post("test")
  async testFanout(@Req() req, @Body() body: any) {
    return this.feedService.dispatchFanout({
      id: body.postId,
      authorId: req.user.id,
      createdAt: new Date(),
    });
  }
}
