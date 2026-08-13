import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Tracks devices used to access a user's account. New/unrecognized devices
 * trigger step-up verification (2FA) even if the JWT is valid, which is the
 * standard fintech defense against stolen-token account takeover.
 */
@Injectable()
export class DeviceFingerprintService {
  private readonly logger = new Logger(DeviceFingerprintService.name);

  constructor(private readonly prisma: PrismaService) {}

  hash(rawFingerprint: string): string {
    return createHash('sha256').update(rawFingerprint).digest('hex');
  }

  async isKnownDevice(userId: string, rawFingerprint: string): Promise<boolean> {
    const fingerprint = this.hash(rawFingerprint);
    const record = await this.prisma.deviceFingerprint.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
    });
    return !!record?.trusted;
  }

  async recordDevice(userId: string, rawFingerprint: string, userAgent?: string, ip?: string, trusted = false) {
    const fingerprint = this.hash(rawFingerprint);
    return this.prisma.deviceFingerprint.upsert({
      where: { userId_fingerprint: { userId, fingerprint } },
      update: { lastSeenAt: new Date(), lastSeenIp: ip, userAgent },
      create: { userId, fingerprint, userAgent, lastSeenIp: ip, trusted },
    });
  }
}
