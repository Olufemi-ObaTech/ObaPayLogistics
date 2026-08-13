import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';

/** TOTP-based 2FA (Google Authenticator / Authy compatible). */
@Injectable()
export class TotpService {
  constructor(private readonly config: ConfigService) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  getOtpAuthUrl(email: string, secret: string): string {
    const issuer = this.config.get<string>('TOTP_ISSUER', 'ObaPay');
    return authenticator.keyuri(email, issuer, secret);
  }

  verify(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }
}
