import { IsString } from 'class-validator';

export class ConfirmShipmentDto {
  @IsString()
  shipmentId: string;

  @IsString()
  walletId: string;
}
