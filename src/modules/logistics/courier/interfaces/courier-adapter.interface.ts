export interface Address {
  line1: string;
  city: string;
  state?: string;
  country: string; // ISO 3166-1 alpha-2
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number; // all in cm
}

export type ShippingMethodType = 'AIR' | 'SEA' | 'ROAD';

/** Normalized shape every courier adapter consumes, regardless of the partner's own API contract. */
export interface CourierOrder {
  shipmentId: string;
  origin: Address;
  destination: Address;
  weightKg: number;
  dimensions: Dimensions;
  declaredValue: number;
  declaredValueCurrency: string;
  shippingMethod: ShippingMethodType;
}

export interface CourierRateQuote {
  courierCode: string;
  amount: number;
  currency: string; // courier's native quoting currency
  estimatedDays: number;
  shippingMethod: ShippingMethodType;
}

export interface CourierShipmentResult {
  courierCode: string;
  trackingNumber: string;
  labelUrl?: string;
}

export interface CourierTrackingEvent {
  timestamp: Date;
  location: string;
  statusCode: string; // courier's native status; mapped to our ShipmentStatus enum by the caller
  description: string;
}

/**
 * Every courier partner (DHL, Aramex, Sendy, future local players) implements
 * this interface. ShipmentService and the rate-shopping module only ever talk
 * to ICourierAdapter — swapping a stub for a real integration is a one-file change.
 */
export interface ICourierAdapter {
  readonly code: string; // e.g. "DHL"
  readonly name: string;

  /** Returns true if this partner services the given origin/destination country pair. */
  supportsRoute(originCountry: string, destinationCountry: string): boolean;

  getRate(order: CourierOrder): Promise<CourierRateQuote>;

  createShipment(order: CourierOrder): Promise<CourierShipmentResult>;

  getTrackingNumber(order: CourierOrder): Promise<string>;

  getTrackingEvents(trackingNumber: string): Promise<CourierTrackingEvent[]>;
}
