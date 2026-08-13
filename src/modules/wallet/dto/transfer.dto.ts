import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class P2pTransferDto {
  @IsString()
  sourceWalletId: string;

  @IsString()
  destinationWalletId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  narration?: string;
}
