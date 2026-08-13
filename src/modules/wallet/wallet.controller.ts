import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { P2pTransferDto } from './dto/transfer.dto';
import { MerchantSettlementDto } from './dto/merchant-settlement.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balances')
  getBalances(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getBalances(user.id);
  }

  @Idempotent()
  @Post('transfer')
  transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: P2pTransferDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    // callerId is derived from the verified JWT, never from the request body,
    // so a caller can never move funds out of a wallet they don't own.
    return this.walletService.p2pTransfer({ ...dto, idempotencyKey, callerId: user.id });
  }

  /**
   * Merchant settlement: payer pays a merchant (identified by userId, not a raw
   * wallet id) and ObaPay captures its 1.5% fee. The payer wallet is always the
   * caller's own wallet in the given currency — never client-supplied.
   */
  @Idempotent()
  @Post('settle')
  settle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MerchantSettlementDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.walletService.merchantSettlement({ ...dto, idempotencyKey, callerId: user.id });
  }
}
