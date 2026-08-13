import { Controller, Get } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.transactionService.listForUser(user.id);
  }
}
