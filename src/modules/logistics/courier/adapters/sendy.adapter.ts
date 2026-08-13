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
 * Sendy adapter — pan-African last-mile aggregator, typically the cheapest
 * and most granular option for intra-continent ROAD shipments (motorbike/van
 * fleets), weaker on intercontinental AIR/SEA. Stubbed against the mock
 * courier simulator pending a real Sendy API contract.
 */
@Injectable()
export class SendyAdapter extends BaseCourierAdapter {
  readonly code = 'SENDY';
  readonly name = 'Sendy';
  protected readonly supportedCountries = new Set([
    'KE', 'NG', 'UG', 'TZ', 'CI', 'GH', 'SN', 'ZA', 'RW', 'ET',
  ]);

  constructor(config: ConfigService) {
    super(config.get<string>('SENDY_API_BASE', 'http://localhost:4001/sendy'), config.get<string>('SENDY_API_KEY', ''));
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
