import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { UserService } from "./users.service";
import { ApiKeyGuard } from "../common/guards/api-key.guard";
import { TransformInterceptor } from "../common/interceptors/transform.interceptor";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";

@Controller("users")
@UseGuards(ApiKeyGuard, ThrottlerGuard)
@UseInterceptors(TransformInterceptor)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  @Get(":id")
  async getUser(@Param("id") id: string) {
    return this.userService.findById(id);
  }
}
