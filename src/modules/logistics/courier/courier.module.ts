import { Module } from '@nestjs/common';
import { DhlAdapter } from './adapters/dhl.adapter';
import { AramexAdapter } from './adapters/aramex.adapter';
import { SendyAdapter } from './adapters/sendy.adapter';
import { RateShoppingService } from './rate-shopping.service';
import { COURIER_ADAPTERS } from './courier.constants';

@Module({
  providers: [
    DhlAdapter,
    AramexAdapter,
    SendyAdapter,
    {
      provide: COURIER_ADAPTERS,
      useFactory: (dhl: DhlAdapter, aramex: AramexAdapter, sendy: SendyAdapter) => [dhl, aramex, sendy],
      inject: [DhlAdapter, AramexAdapter, SendyAdapter],
    },
    RateShoppingService,
  ],
  exports: [RateShoppingService, COURIER_ADAPTERS],
})
export class CourierModule {}
