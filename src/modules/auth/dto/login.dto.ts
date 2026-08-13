import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  emailOrPhone: string;

  @IsString()
  password: string;

  /** Required once the user has enabled 2FA. */
  @IsOptional()
  @IsString()
  totpCode?: string;

  /** Raw client-side device fingerprint (canvas/UA/screen composite hash). */
  @IsString()
  deviceFingerprint: string;
}
