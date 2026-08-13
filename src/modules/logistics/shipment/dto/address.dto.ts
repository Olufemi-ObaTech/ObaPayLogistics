import { IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class AddressDto {
  @IsString()
  line1: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @Length(2, 2)
  country: string; // ISO 3166-1 alpha-2

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
