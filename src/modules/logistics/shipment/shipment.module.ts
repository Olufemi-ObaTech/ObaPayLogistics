import { Module } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { ShipmentController } from './shipment.controller';
import { CourierModule } from '../courier/courier.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { WalletModule } from '../../wallet/wallet.module';
import { FxModule } from '../../fx/fx.module';

@Module({
  imports: [CourierModule, GeocodingModule, WalletModule, FxModule],
  providers: [ShipmentService],
  controllers: [ShipmentController],
  exports: [ShipmentService],
})
export class ShipmentModule {}
