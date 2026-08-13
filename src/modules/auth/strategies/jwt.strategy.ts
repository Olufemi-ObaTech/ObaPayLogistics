import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../../common/redis/redis.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  kycTier: string;
}

// Short cache TTL balances DB load against how quickly a suspension/closure
// (fraud hold, compliance action) needs to take effect on live access tokens.
const STATUS_CACHE_TTL_SECONDS = 30;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // A stolen/leaked access token must stop working promptly once an account
    // is suspended/closed, not merely at its 15-minute expiry — re-check
    // status on every request (cached briefly to avoid a DB hit per call).
    const cacheKey = `user-status:${payload.sub}`;
    let status = await this.redis.getJson<string>(cacheKey);
    if (!status) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { status: true },
      });
      if (!user) throw new UnauthorizedException('Account no longer exists');
      status = user.status;
      await this.redis.setJson(cacheKey, status, STATUS_CACHE_TTL_SECONDS);
    }
    if (status !== 'ACTIVE' && status !== 'PENDING_VERIFICATION') {
      throw new UnauthorizedException('Account is suspended or closed');
    }

    return { id: payload.sub, email: payload.email, kycTier: payload.kycTier };
  }
}
