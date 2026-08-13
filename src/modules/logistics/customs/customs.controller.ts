import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CustomsService } from './customs.service';
import { UploadCustomsDocumentDto } from './dto/upload-document.dto';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';

@Controller('customs')
export class CustomsController {
  constructor(private readonly customsService: CustomsService) {}

  @Idempotent()
  @Post('upload')
  upload(@CurrentUser() user: AuthenticatedUser, @Body() dto: UploadCustomsDocumentDto) {
    return this.customsService.uploadDocument(user.id, dto);
  }

  @Get('status/:shipmentId')
  status(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string) {
    return this.customsService.getStatus(shipmentId, user.id);
  }

  @Get('form/:shipmentId')
  async form(@CurrentUser() user: AuthenticatedUser, @Param('shipmentId') shipmentId: string, @Res() res: Response) {
    const pdf = await this.customsService.generateCustomsForm(shipmentId, user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="customs-${shipmentId}.pdf"`);
    res.send(pdf);
  }
}
