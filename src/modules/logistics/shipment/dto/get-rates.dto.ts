import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsPositive, ValidateNested } from 'class-validator';
import { ShippingMethod } from '@prisma/client';
import { AddressDto } from './address.dto';
import { DimensionsDto } from './create-shipment.dto';

export class GetRatesDto {
  @ValidateNested()
  @Type(() => AddressDto)
  originAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  destinationAddress: AddressDto;

  @IsNumber()
  @IsPositive()
  weightKg: number;

  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensionsCm: DimensionsDto;

  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod;
}
