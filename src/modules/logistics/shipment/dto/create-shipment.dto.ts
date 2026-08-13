import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsPositive, IsString, ValidateNested } from 'class-validator';
import { CustomsCategory, ShippingMethod, WalletCurrency } from '@prisma/client';
import { AddressDto } from './address.dto';

export class DimensionsDto {
  @IsNumber()
  @IsPositive()
  length: number;

  @IsNumber()
  @IsPositive()
  width: number;

  @IsNumber()
  @IsPositive()
  height: number;
}

export class CreateShipmentDto {
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

  @IsNumber()
  @IsPositive()
  declaredValue: number;

  @IsEnum(WalletCurrency)
  declaredValueCurrency: WalletCurrency;

  @IsEnum(CustomsCategory)
  customsCategory: CustomsCategory;

  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod;
}
