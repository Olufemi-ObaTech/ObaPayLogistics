import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsPositive, IsString, Length } from 'class-validator';
import { ShippingMethod } from '@prisma/client';

/** Flattened query-string version of GetRatesDto, for GET /rates. */
export class GetRatesQueryDto {
  @IsString()
  originLine1: string;
  @IsString()
  originCity: string;
  @Length(2, 2)
  originCountry: string;

  @IsString()
  destinationLine1: string;
  @IsString()
  destinationCity: string;
  @Length(2, 2)
  destinationCountry: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  weightKg: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  length: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  width: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  height: number;

  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod;

  toGetRatesDto() {
    return {
      originAddress: { line1: this.originLine1, city: this.originCity, country: this.originCountry },
      destinationAddress: { line1: this.destinationLine1, city: this.destinationCity, country: this.destinationCountry },
      weightKg: this.weightKg,
      dimensionsCm: { length: this.length, width: this.width, height: this.height },
      shippingMethod: this.shippingMethod,
    };
  }
}
