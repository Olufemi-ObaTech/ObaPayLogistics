import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletCurrency } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * FX conversion + spread. In production this would poll a real rate provider
 * (e.g. Reuters, a regional aggregator) on a schedule; here we seed/refresh a
 * small static table and apply ObaPay's spread on top of mid-market.
 */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getMidMarketRate(base: WalletCurrency, quote: WalletCurrency): Promise<number> {
    if (base === quote) return 1;
    const rate = await this.prisma.fxRate.findUnique({
      where: { baseCurrency_quoteCurrency: { baseCurrency: base, quoteCurrency: quote } },
    });
    if (!rate) {
      throw new NotFoundException(`No FX rate available for ${base}->${quote}`);
    }
    return Number(rate.rate);
  }

  /** Converts an amount and returns both the converted value and the spread captured as revenue. */
  async convert(amount: number, base: WalletCurrency, quote: WalletCurrency): Promise<{ converted: number; spreadAmount: number }> {
    if (base === quote) {
      return { converted: amount, spreadAmount: 0 };
    }
    const spreadPct = this.config.get<number>('FX_SPREAD_PCT', 0.5) / 100;
    const midRate = await this.getMidMarketRate(base, quote);
    const rawConverted = amount * midRate;
    const spreadAmount = rawConverted * spreadPct;
    const converted = rawConverted - spreadAmount; // user receives slightly less than mid-market; spread is ObaPay revenue
    return { converted, spreadAmount };
  }

  async upsertRate(base: WalletCurrency, quote: WalletCurrency, rate: number, source = 'internal') {
    return this.prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: base, quoteCurrency: quote } },
      update: { rate, source, fetchedAt: new Date() },
      create: { baseCurrency: base, quoteCurrency: quote, rate, source },
    });
  }
}
