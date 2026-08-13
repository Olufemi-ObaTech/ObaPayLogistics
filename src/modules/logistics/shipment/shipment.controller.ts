import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ConfirmShipmentDto } from './dto/confirm-shipment.dto';
import { GetRatesQueryDto } from './dto/get-rates-query.dto';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';

@Controller()
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  /** GET /rates?originLine1=...&originCity=...&originCountry=NG&destinationLine1=...&... */
  @Get('rates')
  getRates(@Query() query: GetRatesQueryDto) {
    return this.shipmentService.getRateEstimate(query.toGetRatesDto());
  }

  @Idempotent()
  @Post('shipment/create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShipmentDto) {
    return this.shipmentService.createShipment(user.id, dto);
  }

  @Idempotent()
  @Post('shipment/confirm')
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmShipmentDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.shipmentService.payForShipment(user.id, dto.shipmentId, dto.walletId, idempotencyKey);
  }

  @Get('shipment/:id/track')
  track(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shipmentService.track(id, user.id);
  }

  @Get('shipment/history')
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.shipmentService.history(user.id);
  }
}
