import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../email/email.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Inject } from "@nestjs/common";
import { BcryptPoolService } from "./workers/bcrypt-pool.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private bcryptPoolService: BcryptPoolService,
  ) {}

  private hashIp(ip: string): string {
    return crypto.createHash("sha256").update(ip).digest("hex");
  }

  async register(data: RegisterDto, ip: string, userAgent: string) {
    const { name, username, email, password } = data;

    const emailExists = await this.prisma.user.findUnique({ where: { email } });
    if (emailExists) throw new ConflictException("Email already exists");

    const usernameExists = await this.prisma.user.findUnique({
      where: { username },
    });
    if (usernameExists) throw new ConflictException("Username already exists");

    const hashedPassword = await this.bcryptPoolService.hash(password, 8); // Reduced cost factor for speed
    const hashedIp = this.hashIp(ip);

    const user = await this.prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        lastLoginAt: new Date(),
        lastLoginIp: hashedIp,
        lastLoginUserAgent: userAgent,
      },
    });

    const tokens = await this.generateTokens(user.id, ip, userAgent);

    // Trigger email queue
    await this.emailService.sendWelcomeEmail(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      ...tokens,
    };
  }

  async login(data: LoginDto, ip: string, userAgent: string) {
    const { email, password } = data;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new UnauthorizedException("Invalid credentials");

    // Google-only accounts have no password — direct them to use OAuth
    if (!user.password) {
      throw new UnauthorizedException(
        "This account uses Google sign-in. Please continue with Google.",
      );
    }

    const match = await this.bcryptPoolService.compare(password, user.password);
    if (!match) throw new UnauthorizedException("Invalid credentials");

    const hashedIp = this.hashIp(ip);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: hashedIp,
        lastLoginUserAgent: userAgent,
      },
    });

    await this.enforceDeviceLimit(user.id);
    const tokens = await this.generateTokens(user.id, ip, userAgent);

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string, accessToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    if (accessToken) {
      try {
        const decoded = this.jwtService.decode(accessToken) as any;
        if (decoded && decoded.exp && decoded.jti) {
          const ttl = decoded.exp * 1000 - Date.now();
          if (ttl > 0) {
            await this.cacheManager.set(`denylist:${decoded.jti}`, true, ttl);
          }
        }
      } catch (error) {
        // Ignore decode errors on logout
      }
    }
  }

  async refresh(oldToken: string, ip: string, userAgent: string) {
    if (!oldToken) throw new UnauthorizedException("No refresh token");

    try {
      const payload = this.jwtService.verify(oldToken, {
        secret:
          this.configService.get<string>("REFRESH_SECRET") ||
          "refresh_secret_key",
      });

      const savedToken = await this.prisma.refreshToken.findUnique({
        where: { token: oldToken },
        include: { user: true },
      });

      if (!savedToken) throw new UnauthorizedException("Invalid refresh token");

      // Reuse Detection
      if (savedToken.replacedByToken) {
        // Security: Revoke all tokens for this user
        await this.prisma.refreshToken.updateMany({
          where: { userId: savedToken.userId },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedException("Refresh token reused");
      }

      if (savedToken.revokedAt) {
        throw new UnauthorizedException("Token revoked");
      }

      const user = savedToken.user;
      if (!user)
        throw new UnauthorizedException("User not found");

      const tokens = await this.generateTokens(user.id, ip, userAgent);

      // Update chain via transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.refreshToken.update({
          where: { id: savedToken.id },
          data: {
            revokedAt: new Date(),
            replacedByToken: tokens.refreshToken,
          },
        });
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Expired or invalid refresh token");
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      throw new UnauthorizedException("User not found");
    return {
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  private async enforceDeviceLimit(userId: string) {
    const MAX_SESSIONS = this.configService.get<number>("MAX_SESSIONS") || 5;

    const activeSessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: { id: true },
    });

    if (activeSessions.length >= MAX_SESSIONS) {
      const numToRevoke = activeSessions.length - MAX_SESSIONS + 1;
      const sessionsToRevoke = activeSessions
        .slice(0, numToRevoke)
        .map((s) => s.id);

      await this.prisma.refreshToken.updateMany({
        where: { id: { in: sessionsToRevoke } },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async generateTokens(userId: string, ip: string, userAgent: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { id: userId, jti: crypto.randomUUID() },
        {
          secret:
            this.configService.get<string>("ACCESS_SECRET") ||
            "access_secret_key",
          expiresIn: "15m",
        },
      ),
      this.jwtService.signAsync(
        { id: userId, tokenId: crypto.randomUUID() },
        {
          secret:
            this.configService.get<string>("REFRESH_SECRET") ||
            "refresh_secret_key",
          expiresIn: "7d",
        },
      ),
    ]);

    const hashedIp = this.hashIp(ip);

    // Store in DB
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        ipAddress: hashedIp,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { accessToken, refreshToken };
  }


  async deleteAccount(userId: string) {
    // Because of onDelete: Cascade in the Prisma schema,
    // deleting the user will automatically delete their:
    // - Posts
    // - Comments
    // - Likes
    // - Notifications
    // - Refresh Tokens
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async googleLogin(
    googleUser: {
      googleId: string;
      email: string;
      name: string;
      avatarUrl?: string;
    },
    ip: string,
    userAgent: string,
  ) {
    const { googleId, email, name, avatarUrl } = googleUser;

    // 1. Find by Google ID first
    let user = await this.prisma.user.findUnique({ where: { googleId } });

    // 2. Try to merge with an existing account by email
    if (!user) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: { googleId, avatarUrl: existing.avatarUrl ?? avatarUrl },
        });
      }
    }

    // 3. Create a brand-new Google-only user
    if (!user) {
      const base = (name ?? email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 20);
      const suffix = crypto.randomBytes(3).toString("hex"); // 6 chars
      const username = `${base}_${suffix}`;

      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          name,
          username,
          avatarUrl,
          lastLoginAt: new Date(),
          lastLoginIp: this.hashIp(ip),
          lastLoginUserAgent: userAgent,
        },
      });

      // Send welcome email for new users
      await this.emailService.sendWelcomeEmail(user.id, user.email);
    } else {
      // Update login metadata for returning users
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: this.hashIp(ip),
          lastLoginUserAgent: userAgent,
        },
      });
    }

    await this.enforceDeviceLimit(user.id);
    const tokens = await this.generateTokens(user.id, ip, userAgent);

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      ...tokens,
    };
  }
}
