import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs a callback inside a Prisma interactive transaction with ACID guarantees.
   * Every wallet-affecting operation (transfers, escrow hold/release) must go
   * through this so balance updates and ledger writes commit or roll back together.
   */
  async runInTransaction<T>(fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>): Promise<T> {
    return this.$transaction(fn, {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });
  }
}
