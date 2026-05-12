import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("ACCESS_SECRET") || "access_secret_key",
    });
  }

  async validate(payload: {
    id: string;
    jti?: string;
    exp?: number;
    iat?: number;
  }) {
    if (payload.jti) {
      const isDenied = await this.cacheManager.get(`denylist:${payload.jti}`);
      if (isDenied) {
        throw new UnauthorizedException("Token has been revoked");
      }
    }
    return { id: payload.id };
  }
}
