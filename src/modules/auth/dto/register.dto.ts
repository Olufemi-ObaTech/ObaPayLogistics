import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// A representative subset of the 54 AU member states' ISO 3166-1 alpha-2 codes.
export const AFRICAN_COUNTRY_CODES = [
  'NG', 'KE', 'ZA', 'GH', 'EG', 'ET', 'TZ', 'UG', 'RW', 'CI',
  'SN', 'CM', 'ML', 'BF', 'DZ', 'MA', 'TN', 'ZM', 'ZW', 'MZ',
  'AO', 'CD', 'BJ', 'TG', 'NE', 'TD', 'GA', 'CG', 'SL', 'LR',
] as const;

export class RegisterDto {
  @IsEmail()
  email: string;

  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phone must be in E.164 format, e.g. +2348012345678' })
  phone: string;

  @IsString()
  @MinLength(10, { message: 'password must be at least 10 characters' })
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsIn(AFRICAN_COUNTRY_CODES)
  country: string;

  @IsOptional()
  @IsString()
  preferredCurrency?: string;
}
