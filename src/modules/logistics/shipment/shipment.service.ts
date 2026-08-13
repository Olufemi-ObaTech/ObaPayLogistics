import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuid } from 'uuid';
import { ShipmentStatus, WalletCurrency } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { WalletService } from '../../wallet/wallet.service';
import { FxService } from '../../fx/fx.service';
import { NotificationService } from '../../notification/notification.service';
import { RateShoppingService } from '../courier/rate-shopping.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { GetRatesDto } from './dto/get-rates.dto';
import { CourierOrder } from '../courier/interfaces/courier-adapter.interface';

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wallet: WalletService,
    private readonly fx: FxService,
    private readonly notification: NotificationService,
    private readonly rateShopping: RateShoppingService,
    private readonly geocoding: GeocodingService,
    private readonly config: ConfigService,
  ) {}

  /** GET /rates — quote before creating a shipment, no persistence required. */
  async getRateEstimate(dto: GetRatesDto) {
    const order = this.toCourierOrder(uuid(), dto);
    const result = await this.rateShopping.shop(order, 'CHEAPEST');
    return {
      recommended: result.winner,
      allQuotes: result.allQuotes,
      unavailableCouriers: result.failedCouriers,
    };
  }

  /**
   * POST /shipment/create — validates addresses, rate-shops across couriers,
   * and persists a DRAFT/PENDING_PAYMENT shipment with the price locked in
   * (in the user's preferred currency, margin included) for the user to confirm.
   */
  async createShipment(userId: string, dto: CreateShipmentDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Geocoding validates the addresses are resolvable; failure here is a hard
    // stop (bad address), unlike downstream courier flakiness which degrades gracefully.
    await this.geocoding.validateAndGeocode(dto.originAddress);
    await this.geocoding.validateAndGeocode(dto.destinationAddress);

    const shipmentId = uuid();
    const order = this.toCourierOrder(shipmentId, {
      originAddress: dto.originAddress,
      destinationAddress: dto.destinationAddress,
      weightKg: dto.weightKg,
      dimensionsCm: dto.dimensionsCm,
      shippingMethod: dto.shippingMethod,
    });

    const { winner, allQuotes, failedCouriers } = await this.rateShopping.shop(order, 'CHEAPEST');

    const { finalPrice, marginAmount, priceCurrency } = await this.applyMargin(winner.amount, winner.currency, user.preferredCurrency as WalletCurrency);

    const shipment = await this.prisma.shipment.create({
      data: {
        id: shipmentId,
        userId,
        originAddress: dto.originAddress as any,
        destinationAddress: dto.destinationAddress as any,
        weightKg: dto.weightKg,
        dimensionsCm: dto.dimensionsCm as any,
        declaredValue: dto.declaredValue,
        declaredValueCurrency: dto.declaredValueCurrency,
        customsCategory: dto.customsCategory,
        shippingMethod: dto.shippingMethod,
        status: ShipmentStatus.PENDING_PAYMENT,
        quotedRate: winner.amount,
        finalPrice,
        priceCurrency,
        marginAmount,
        courierPartnerId: await this.resolveCourierPartnerId(winner.courierCode),
      },
    });

    await this.prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        location: dto.originAddress.city,
        status: ShipmentStatus.PENDING_PAYMENT,
        description: `Shipment created. Best rate: ${winner.courierCode} (${allQuotes.length} quotes${failedCouriers.length ? `, ${failedCouriers.length} partner(s) unavailable` : ''})`,
        source: 'internal',
      },
    });

    this.logger.log({ msg: 'shipment_created', shipmentId: shipment.id, userId, courier: winner.courierCode, finalPrice });

    return {
      shipment,
      estimatedCost: { amount: finalPrice, currency: priceCurrency },
      selectedCourier: winner.courierCode,
      allQuotes,
    };
  }

  /**
   * POST /shipment/confirm — deducts the locked-in price from the user's
   * wallet into escrow, then hands the order to the winning courier adapter
   * to obtain a real tracking number and kick off pickup.
   */
  async payForShipment(callerId: string, shipmentId: string, walletId: string, idempotencyKey: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { courierPartner: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    // Ownership check first: a shipment lookup should never confirm to an
    // attacker whether a given shipmentId exists if it isn't theirs.
    if (shipment.userId !== callerId) throw new NotFoundException('Shipment not found');
    if (shipment.status !== ShipmentStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Shipment is in status ${shipment.status}, cannot pay`);
    }
    if (!shipment.finalPrice || !shipment.priceCurrency || !shipment.courierPartner) {
      throw new BadRequestException('Shipment is missing a locked-in rate; request a new quote');
    }

    // 1. Move funds into escrow (fails fast with a clear error on insufficient
    // balance; holdForShipment independently re-verifies wallet ownership).
    await this.wallet.holdForShipment({
      idempotencyKey,
      callerId,
      walletId,
      shipmentId,
      amount: Number(shipment.finalPrice),
    });

    // 2. Hand off to the courier. If this fails, the escrow hold stays HELD and
    // an operator/retry job can re-attempt handoff without re-charging the user.
    const adapter = this.rateShopping.getAdapterByCode(shipment.courierPartner.code);
    const order = this.toCourierOrder(shipmentId, {
      originAddress: shipment.originAddress as any,
      destinationAddress: shipment.destinationAddress as any,
      weightKg: Number(shipment.weightKg),
      dimensionsCm: shipment.dimensionsCm as any,
      shippingMethod: shipment.shippingMethod,
    });

    let trackingNumber: string;
    try {
      const result = await adapter.createShipment(order);
      trackingNumber = result.trackingNumber;
    } catch (err) {
      this.logger.error({ msg: 'courier_handoff_failed', shipmentId, courier: shipment.courierPartner.code, error: (err as Error).message });
      throw new BadRequestException('Payment succeeded but courier pickup could not be scheduled yet; our team will retry automatically');
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.PAID, paidAt: new Date(), trackingNumber },
    });

    await this.prisma.trackingEvent.create({
      data: {
        shipmentId,
        location: (shipment.originAddress as any).city,
        status: ShipmentStatus.PAID,
        description: `Payment confirmed. Courier ${shipment.courierPartner.name} assigned tracking number ${trackingNumber}.`,
        source: 'internal',
      },
    });

    await this.notification.notifyUser(shipment.userId, 'shipment.paid', { shipmentId, trackingNumber });

    // Kick off pickup + the simulated customs clearance timeline; MVP only.
    void this.simulatePickupAndTransit(shipmentId);

    return updated;
  }

  /**
   * GET /shipment/:id/track — returns the latest known status. Prefers live
   * courier events (cached briefly in Redis) but always has the internally
   * stored event log as a fallback if the courier API is unreachable.
   */
  async track(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { courierPartner: true, trackingEvents: { orderBy: { timestamp: 'desc' } } },
    });
    if (!shipment || shipment.userId !== userId) throw new NotFoundException('Shipment not found');

    if (shipment.trackingNumber && shipment.courierPartner) {
      const cacheKey = `tracking:${shipment.trackingNumber}`;
      const cached = await this.redis.getJson<{ fetchedAt: string }>(cacheKey);
      if (!cached) {
        try {
          const adapter = this.rateShopping.getAdapterByCode(shipment.courierPartner.code);
          const events = await adapter.getTrackingEvents(shipment.trackingNumber);
          if (events.length) {
            const latest = events[events.length - 1];
            await this.prisma.trackingEvent.create({
              data: {
                shipmentId,
                location: latest.location,
                status: shipment.status, // courier's native status is mapped upstream in production; kept as-is for MVP
                description: latest.description,
                source: shipment.courierPartner.code,
                timestamp: latest.timestamp,
              },
            });
          }
          await this.redis.setJson(cacheKey, { fetchedAt: new Date().toISOString() }, 30);
        } catch (err) {
          this.logger.warn(`Live tracking fetch failed for ${shipmentId}, serving cached events: ${(err as Error).message}`);
        }
      }
    }

    const events = await this.prisma.trackingEvent.findMany({ where: { shipmentId }, orderBy: { timestamp: 'desc' } });
    return { shipment, latestEvent: events[0] ?? null, events };
  }

  /** GET /shipment/history */
  async history(userId: string) {
    return this.prisma.shipment.findMany({
      where: { userId },
      include: { courierPartner: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private toCourierOrder(shipmentId: string, dto: {
    originAddress: any;
    destinationAddress: any;
    weightKg: number;
    dimensionsCm: any;
    shippingMethod: string;
  }): CourierOrder {
    return {
      shipmentId,
      origin: dto.originAddress,
      destination: dto.destinationAddress,
      weightKg: dto.weightKg,
      dimensions: dto.dimensionsCm,
      declaredValue: 0,
      declaredValueCurrency: 'USD',
      shippingMethod: dto.shippingMethod as any,
    };
  }

  private async applyMargin(courierAmount: number, courierCurrency: string, userCurrency: WalletCurrency) {
    const marginPct = this.config.get<number>('LOGISTICS_MARGIN_PCT', 8) / 100;
    const { converted } = await this.fx.convert(courierAmount, courierCurrency as WalletCurrency, userCurrency);
    const marginAmount = converted * marginPct;
    const finalPrice = converted + marginAmount;
    return { finalPrice, marginAmount, priceCurrency: userCurrency };
  }

  private async resolveCourierPartnerId(code: string): Promise<string> {
    const partner = await this.prisma.courierPartner.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
        apiEndpoint: 'stub',
        apiKey: 'stub',
        supportedCountries: [],
        supportedMethods: ['AIR', 'SEA', 'ROAD'],
      },
    });
    return partner.id;
  }

  /**
   * MVP border-crossing simulation: pickup -> in transit -> customs clearance
   * -> auto-cleared after a random 1-5 minute delay -> delivered. Mirrors the
   * "customs cleared" simulation described in the product spec until a real
   * single-window customs integration (e.g. TradeMark Africa) replaces it.
   *
   * The clearance delay is persisted (customsClearAt) and resolved by a cron
   * sweep, not an in-process setTimeout: a bare setTimeout is lost on
   * deploy/restart/crash (escrow would stay HELD forever) and doesn't work
   * once this runs as more than one replica.
   */
  private async simulatePickupAndTransit(shipmentId: string) {
    await this.advanceStatus(shipmentId, ShipmentStatus.PICKED_UP, 'Courier picked up the parcel');
    await this.advanceStatus(shipmentId, ShipmentStatus.IN_TRANSIT, 'Parcel in transit');
    await this.advanceStatus(shipmentId, ShipmentStatus.CUSTOMS_CLEARANCE, 'Parcel arrived at destination customs checkpoint');

    const minDelay = this.config.get<number>('CUSTOMS_AUTO_CLEAR_MIN_DELAY_MS', 60_000);
    const maxDelay = this.config.get<number>('CUSTOMS_AUTO_CLEAR_MAX_DELAY_MS', 300_000);
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { customsClearAt: new Date(Date.now() + delay) },
    });
  }

  /** Periodic sweep: clears any shipment whose customs delay has elapsed. Durable across restarts/replicas. */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweepCustomsClearance() {
    const due = await this.prisma.shipment.findMany({
      where: { status: ShipmentStatus.CUSTOMS_CLEARANCE, customsClearAt: { lte: new Date() } },
      select: { id: true },
      take: 100,
    });

    for (const { id } of due) {
      // Distributed lock so two replicas ticking at the same moment don't
      // both try to release the same escrow hold.
      const acquired = await this.redis.acquireLock(`customs-clear-lock:${id}`, 60_000);
      if (!acquired) continue;
      try {
        await this.autoClearCustoms(id);
      } catch (err) {
        this.logger.error(`Customs auto-clear sweep failed for ${id}: ${(err as Error).message}`);
      }
    }
  }

  private async autoClearCustoms(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment || shipment.status !== ShipmentStatus.CUSTOMS_CLEARANCE) return;

    await this.advanceStatus(shipmentId, ShipmentStatus.DELIVERED, 'Cleared customs and delivered to recipient');
    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { deliveredAt: new Date(), customsClearAt: null },
    });
    await this.wallet.releaseEscrowToCourier(shipmentId);
    await this.notification.notifyUser(shipment.userId, 'shipment.delivered', { shipmentId });
  }

  private async advanceStatus(shipmentId: string, status: ShipmentStatus, description: string) {
    const shipment = await this.prisma.shipment.update({ where: { id: shipmentId }, data: { status } });
    const destination = shipment.destinationAddress as any;
    await this.prisma.trackingEvent.create({
      data: { shipmentId, status, location: destination?.city ?? 'in transit', description, source: 'internal' },
    });
    return shipment;
  }
}
