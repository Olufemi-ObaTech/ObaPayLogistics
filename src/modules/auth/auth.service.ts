import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TotpService } from './totp.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

// Brute-force defense: beyond the per-IP login throttle, lock the *account*
// out after repeated failures so a distributed attacker (many IPs, one
// target account) can't just spread requests to dodge the IP-based limit.
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TTL_SECONDS = 15 * 60;

function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback: 7 days
  const amount = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
  return amount * unitMs;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly totp: TotpService,
    private readonly deviceFingerprint: DeviceFingerprintService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) {
      throw new ConflictException('An account with this email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const preferredCurrency = dto.preferredCurrency ?? 'USD';

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        country: dto.country,
        preferredCurrency,
        // KYC Tier 1 by default: email+phone captured, wallet-only limits apply
        // until ID verification (Tier 2) or business registration (Tier 3).
        wallets: { create: { currency: preferredCurrency as any } },
      },
    });

    this.logger.log({ msg: 'user_registered', userId: user.id, country: user.country });
    return this.issueTokens(user.id, user.email, user.kycTier);
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const lockoutKey = `login-lockout:${dto.emailOrPhone.toLowerCase()}`;
    const failCountKey = `login-fails:${dto.emailOrPhone.toLowerCase()}`;

    if (await this.redis.getJson<boolean>(lockoutKey)) {
      throw new UnauthorizedException('Too many failed attempts. Try again in a few minutes.');
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.emailOrPhone }, { phone: dto.emailOrPhone }] },
    });

    const fail = async (reason: string) => {
      const attempts = ((await this.redis.getJson<number>(failCountKey)) ?? 0) + 1;
      await this.redis.setJson(failCountKey, attempts, LOCKOUT_TTL_SECONDS);
      if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        await this.redis.setJson(lockoutKey, true, LOCKOUT_TTL_SECONDS);
        this.logger.warn({ msg: 'account_locked_out', identifier: dto.emailOrPhone, ip });
      }
      this.logger.warn({ msg: 'login_failed', reason, identifier: dto.emailOrPhone, ip });
      throw new UnauthorizedException('Invalid credentials');
    };

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      return fail('bad_credentials');
    }
    if (user.status !== 'ACTIVE' && user.status !== 'PENDING_VERIFICATION') {
      return fail('account_not_active');
    }

    const isKnownDevice = await this.deviceFingerprint.isKnownDevice(user.id, dto.deviceFingerprint);

    if (user.totpEnabled || !isKnownDevice) {
      // Step-up auth required: either the user opted into 2FA, or this is an
      // unrecognized device (classic ATO defense even without 2FA enabled).
      if (!dto.totpCode) {
        throw new UnauthorizedException(
          user.totpEnabled
            ? 'TOTP code required'
            : 'Unrecognized device: TOTP code required to confirm identity',
        );
      }
      if (!user.totpSecret || !this.totp.verify(dto.totpCode, user.totpSecret)) {
        return fail('bad_totp');
      }
    }

    // Successful login: clear any accumulated failure count.
    await this.redis.release(failCountKey);
    await this.redis.release(lockoutKey);

    await this.deviceFingerprint.recordDevice(user.id, dto.deviceFingerprint, userAgent, ip, true);

    this.logger.log({ msg: 'user_login', userId: user.id, ip });
    return this.issueTokens(user.id, user.email, user.kycTier);
  }

  /** Rotates a refresh token: the old one is revoked, a new pair is issued. */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      if (stored?.revoked) {
        // Presenting an already-revoked refresh token strongly suggests it
        // was stolen and both the legitimate user and attacker are using it;
        // kill every active session for this user rather than trust it.
        await this.prisma.refreshToken.updateMany({
          where: { userId: payload.sub, revoked: false },
          data: { revoked: true },
        });
        this.logger.warn({ msg: 'refresh_token_reuse_detected', userId: payload.sub });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    return this.issueTokens(user.id, user.email, user.kycTier);
  }

  /** Revokes one refresh token (single device) or all of the user's tokens (global logout). */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({ where: { userId, tokenHash }, data: { revoked: true } });
    } else {
      await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    }
    return { loggedOut: true };
  }

  async enableTotp(userId: string) {
    const secret = this.totp.generateSecret();
    const user = await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    return { secret, otpAuthUrl: this.totp.getOtpAuthUrl(user.email, secret) };
  }

  async confirmTotp(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.totpSecret || !this.totp.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid TOTP code');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    return { totpEnabled: true };
  }

  private async issueTokens(userId: string, email: string, kycTier: string) {
    const payload = { sub: userId, email, kycTier };
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + parseDurationMs(refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken, userId };
  }
}
