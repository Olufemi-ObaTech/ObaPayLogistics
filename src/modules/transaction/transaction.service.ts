import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const wallets = await this.prisma.wallet.findMany({ where: { userId }, select: { id: true } });
    const walletIds = wallets.map((w) => w.id);

    return this.prisma.transaction.findMany({
      where: { OR: [{ sourceWalletId: { in: walletIds } }, { destinationWalletId: { in: walletIds } }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
