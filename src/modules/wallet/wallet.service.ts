import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EscrowStatus, TransactionStatus, TransactionType, WalletCurrency } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FxService } from '../fx/fx.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fx: FxService,
    private readonly config: ConfigService,
  ) {}

  async getOrCreateWallet(userId: string, currency: WalletCurrency) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId_currency: { userId, currency } } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { userId, currency } });
  }

  async getBalances(userId: string) {
    return this.prisma.wallet.findMany({ where: { userId } });
  }

  /**
   * Free P2P transfer between two ObaPay wallets. No fee is captured here —
   * per the business rules, end-user P2P/bill-pay/intra-wallet moves are 100% free.
   * Cross-currency transfers apply the FX spread as ObaPay's only revenue on this path.
   */
  async p2pTransfer(params: {
    idempotencyKey: string;
    callerId: string;
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    narration?: string;
  }) {
    if (params.amount <= 0) throw new BadRequestException('Amount must be positive');
    if (params.sourceWalletId === params.destinationWalletId) {
      throw new BadRequestException('Source and destination wallets must be different');
    }

    return this.prisma.runInTransaction(async (tx) => {
      const source = await tx.wallet.findUniqueOrThrow({ where: { id: params.sourceWalletId } });
      const destination = await tx.wallet.findUniqueOrThrow({ where: { id: params.destinationWalletId } });

      // Authorization: the caller may only move funds OUT of a wallet they own.
      // Without this check, any authenticated user could drain any wallet by
      // guessing/observing its id, since wallet ids alone were previously trusted.
      if (source.userId !== params.callerId) {
        throw new ForbiddenException('You do not own the source wallet');
      }

      const spendable = Number(source.balance);
      if (spendable < params.amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      let creditAmount = params.amount;
      let spreadAmount = 0;
      if (source.currency !== destination.currency) {
        const conversion = await this.fx.convert(params.amount, source.currency, destination.currency);
        creditAmount = conversion.converted;
        spreadAmount = conversion.spreadAmount;
      }

      await tx.wallet.update({ where: { id: source.id }, data: { balance: { decrement: params.amount } } });
      await tx.wallet.update({ where: { id: destination.id }, data: { balance: { increment: creditAmount } } });

      return tx.transaction.create({
        data: {
          type: TransactionType.P2P_TRANSFER,
          status: TransactionStatus.COMPLETED,
          amount: params.amount,
          currency: source.currency,
          fxSpreadAmount: spreadAmount,
          sourceWalletId: source.id,
          destinationWalletId: destination.id,
          idempotencyKey: params.idempotencyKey,
          narration: params.narration ?? 'P2P transfer',
        },
      });
    });
  }

  /**
   * Merchant settlement: user pays a merchant wallet, ObaPay captures its
   * 1.5% settlement fee out of the gross amount before crediting the merchant.
   */
  /**
   * Merchant is identified by userId (never a raw wallet id) and the payer
   * wallet is always resolved from the authenticated caller, so a request
   * body can never redirect funds out of someone else's wallet.
   */
  async merchantSettlement(params: {
    idempotencyKey: string;
    callerId: string;
    merchantUserId: string;
    currency: WalletCurrency;
    amount: number;
  }) {
    if (params.amount <= 0) throw new BadRequestException('Amount must be positive');
    if (params.merchantUserId === params.callerId) {
      throw new BadRequestException('Cannot settle a payment to yourself');
    }

    const feePct = this.config.get<number>('MERCHANT_SETTLEMENT_FEE_PCT', 1.5) / 100;

    return this.prisma.runInTransaction(async (tx) => {
      const merchant = await tx.user.findUnique({ where: { id: params.merchantUserId } });
      if (!merchant || merchant.status !== 'ACTIVE') {
        throw new NotFoundException('Merchant not found or not active');
      }

      const payer = await tx.wallet.findUniqueOrThrow({
        where: { userId_currency: { userId: params.callerId, currency: params.currency } },
      });
      if (Number(payer.balance) < params.amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const merchantWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: params.merchantUserId, currency: params.currency } },
        update: {},
        create: { userId: params.merchantUserId, currency: params.currency },
      });

      const fee = params.amount * feePct;
      const netToMerchant = params.amount - fee;

      await tx.wallet.update({ where: { id: payer.id }, data: { balance: { decrement: params.amount } } });
      await tx.wallet.update({ where: { id: merchantWallet.id }, data: { balance: { increment: netToMerchant } } });

      return tx.transaction.create({
        data: {
          type: TransactionType.MERCHANT_SETTLEMENT,
          status: TransactionStatus.COMPLETED,
          amount: params.amount,
          currency: payer.currency,
          feeAmount: fee,
          sourceWalletId: payer.id,
          destinationWalletId: merchantWallet.id,
          idempotencyKey: params.idempotencyKey,
          narration: 'Merchant settlement',
        },
      });
    });
  }

  // -------------------------------------------------------------------------
  // Shipping / escrow — used exclusively by ShipmentService.payForShipment
  // -------------------------------------------------------------------------

  /**
   * Deducts the shipment's final price from the user's wallet and places it
   * into escrow (heldBalance) rather than immediately crediting a courier
   * wallet. Funds are only actually "spent" (released) on delivery, and
   * refunded back to the user if the shipment is cancelled/returned pre-transit.
   */
  async holdForShipment(params: {
    idempotencyKey: string;
    callerId: string;
    walletId: string;
    shipmentId: string;
    amount: number;
  }) {
    if (params.amount <= 0) throw new BadRequestException('Shipping amount must be positive');

    return this.prisma.runInTransaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: params.walletId } });
      if (wallet.userId !== params.callerId) {
        throw new ForbiddenException('You do not own this wallet');
      }
      if (Number(wallet.balance) < params.amount) {
        throw new BadRequestException('Insufficient wallet balance to pay for shipping');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: params.amount }, heldBalance: { increment: params.amount } },
      });

      const escrow = await tx.escrowHold.create({
        data: {
          shipmentId: params.shipmentId,
          walletId: wallet.id,
          amount: params.amount,
          currency: wallet.currency,
          status: EscrowStatus.HELD,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.SHIPPING_PAYMENT,
          status: TransactionStatus.COMPLETED,
          amount: params.amount,
          currency: wallet.currency,
          sourceWalletId: wallet.id,
          shipmentId: params.shipmentId,
          idempotencyKey: params.idempotencyKey,
          narration: 'Shipping fee held in escrow',
        },
      });

      this.logger.log({ msg: 'escrow_held', shipmentId: params.shipmentId, escrowId: escrow.id, amount: params.amount });
      return { escrow, transaction };
    });
  }

  /** Called when a shipment reaches DELIVERED: escrow funds are released to ObaPay/courier settlement. */
  async releaseEscrowToCourier(shipmentId: string) {
    return this.prisma.runInTransaction(async (tx) => {
      const escrow = await tx.escrowHold.findUnique({ where: { shipmentId } });
      if (!escrow) throw new NotFoundException('No escrow hold found for this shipment');
      if (escrow.status !== EscrowStatus.HELD) return escrow;

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: escrow.walletId } });
      await tx.wallet.update({ where: { id: wallet.id }, data: { heldBalance: { decrement: escrow.amount } } });

      const updated = await tx.escrowHold.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.RELEASED_TO_COURIER, resolvedAt: new Date() },
      });

      this.logger.log({ msg: 'escrow_released_to_courier', shipmentId, escrowId: escrow.id });
      return updated;
    });
  }

  /** Called when a shipment is cancelled/returned before pickup: refund the user in full. */
  async refundEscrowToUser(shipmentId: string, idempotencyKey: string) {
    return this.prisma.runInTransaction(async (tx) => {
      const escrow = await tx.escrowHold.findUnique({ where: { shipmentId } });
      if (!escrow) throw new NotFoundException('No escrow hold found for this shipment');
      if (escrow.status !== EscrowStatus.HELD) return escrow;

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: escrow.walletId } });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { heldBalance: { decrement: escrow.amount }, balance: { increment: escrow.amount } },
      });

      const updated = await tx.escrowHold.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.REFUNDED_TO_USER, resolvedAt: new Date() },
      });

      await tx.transaction.create({
        data: {
          type: TransactionType.SHIPPING_REFUND,
          status: TransactionStatus.COMPLETED,
          amount: escrow.amount,
          currency: escrow.currency,
          destinationWalletId: wallet.id,
          shipmentId,
          idempotencyKey,
          narration: 'Shipping fee refunded (shipment cancelled/returned)',
        },
      });

      this.logger.log({ msg: 'escrow_refunded', shipmentId, escrowId: escrow.id });
      return updated;
    });
  }
}
