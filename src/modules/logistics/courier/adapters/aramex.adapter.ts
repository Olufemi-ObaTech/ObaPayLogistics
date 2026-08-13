import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseCourierAdapter } from './base-courier.adapter';
import {
  CourierOrder,
  CourierRateQuote,
  CourierShipmentResult,
  CourierTrackingEvent,
} from '../interfaces/courier-adapter.interface';

/**
 * Aramex adapter — strong Middle East/North & East Africa coverage,
 * competitive on ROAD/AIR within the continent. Stubbed against the mock
 * courier simulator pending a real Aramex API contract.
 */
@Injectable()
export class AramexAdapter extends BaseCourierAdapter {
  readonly code = 'ARAMEX';
  readonly name = 'Aramex';
  protected readonly supportedCountries = new Set([
    'EG', 'KE', 'NG', 'ZA', 'ET', 'TZ', 'UG', 'MA', 'TN', 'DZ', 'GH', 'RW',
  ]);

  constructor(config: ConfigService) {
    super(config.get<string>('ARAMEX_API_BASE', 'http://localhost:4001/aramex'), config.get<string>('ARAMEX_API_KEY', ''));
  }

  async getRate(order: CourierOrder): Promise<CourierRateQuote> {
    const { data } = await this.callResilient(() => this.http.post('/rate', order));
    return { courierCode: this.code, amount: data.amount, currency: data.currency, estimatedDays: data.estimatedDays, shippingMethod: order.shippingMethod };
  }

  async createShipment(order: CourierOrder): Promise<CourierShipmentResult> {
    const { data } = await this.callResilient(() => this.http.post('/shipments', order));
    return { courierCode: this.code, trackingNumber: data.trackingNumber, labelUrl: data.labelUrl };
  }

  async getTrackingNumber(order: CourierOrder): Promise<string> {
    const result = await this.createShipment(order);
    return result.trackingNumber;
  }

  async getTrackingEvents(trackingNumber: string): Promise<CourierTrackingEvent[]> {
    const { data } = await this.callResilient(() => this.http.get(`/tracking/${trackingNumber}`));
    return data.events.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
  }
}
