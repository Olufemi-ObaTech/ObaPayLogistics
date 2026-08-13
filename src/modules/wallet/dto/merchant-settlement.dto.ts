import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';
import { WalletCurrency } from '@prisma/client';

export class MerchantSettlementDto {
  /** Merchant is identified by their ObaPay user id, never a raw wallet id. */
  @IsString()
  merchantUserId: string;

  @IsEnum(WalletCurrency)
  currency: WalletCurrency;

  @IsNumber()
  @IsPositive()
  amount: number;
}
