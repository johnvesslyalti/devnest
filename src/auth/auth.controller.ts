import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  Get,
  Ip,
  Headers,
  UseInterceptors,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { Response, Request } from "express";
import { AuthGuard } from "@nestjs/passport";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CacheTTL } from "@nestjs/cache-manager";
import { UserCacheInterceptor } from "../common/interceptors/user-cache.interceptor";

@UseGuards(ThrottlerGuard)
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    const result = await this.authService.register(registerDto, ip, userAgent);
    this.setCookie(res, result.refreshToken);
    return {
      message: "User registered successfully",
      accessToken: result.accessToken,
      ...result.user,
    };
  }

  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    const result = await this.authService.login(loginDto, ip, userAgent);
    this.setCookie(res, result.refreshToken);
    return {
      message: "Login successful",
      accessToken: result.accessToken,
      ...result.user,
    };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies["refreshToken"];
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(" ")[1];

    await this.authService.logout(refreshToken, accessToken);
    res.clearCookie("refreshToken");
    return { message: "Logged out successfully" };
  }

  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    const refreshToken = req.cookies["refreshToken"];
    const result = await this.authService.refresh(refreshToken, ip, userAgent);
    this.setCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Post("delete")
  @UseGuards(AuthGuard("jwt"))
  async deleteAccount(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.deleteAccount(req.user.id);
    res.clearCookie("refreshToken");
    return { message: "Account deleted successfully" };
  }

  @Get("me")
  @UseInterceptors(UserCacheInterceptor)
  @CacheTTL(30000) // 30 seconds (milliseconds in v5+)
  @UseGuards(AuthGuard("jwt"))
  async me(@Req() req: any) {
    return this.authService.me(req.user.id);
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth() {
    // Passport guard handles the redirect to Google — no body needed
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(
    @Req() req: any,
    @Res() res: Response,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    const result = await this.authService.googleLogin(req.user, ip, userAgent);
    this.setCookie(res, result.refreshToken);
    // Redirect frontend with the short-lived access token in the query string
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private setCookie(res: Response, token: string) {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
