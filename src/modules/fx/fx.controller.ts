import { Controller, Get, Query } from '@nestjs/common';
import { WalletCurrency } from '@prisma/client';
import { FxService } from './fx.service';

@Controller('fx')
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('rate')
  async getRate(@Query('base') base: WalletCurrency, @Query('quote') quote: WalletCurrency) {
    const rate = await this.fx.getMidMarketRate(base, quote);
    return { base, quote, midMarketRate: rate };
  }
}
