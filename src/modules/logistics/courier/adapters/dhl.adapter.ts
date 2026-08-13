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
 * DHL adapter — global reach, strongest on AIR between major African hubs
 * and the rest of the world. Stubbed against the mock courier simulator
 * until a real DHL Express API contract/credentials are in place.
 */
@Injectable()
export class DhlAdapter extends BaseCourierAdapter {
  readonly code = 'DHL';
  readonly name = 'DHL Express';
  protected readonly supportedCountries = new Set([
    'NG', 'KE', 'ZA', 'GH', 'EG', 'ET', 'TZ', 'UG', 'RW', 'CI', 'SN', 'MA', 'TN', 'ZM', 'MZ',
  ]);

  constructor(config: ConfigService) {
    super(config.get<string>('DHL_API_BASE', 'http://localhost:4001/dhl'), config.get<string>('DHL_API_KEY', ''));
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
