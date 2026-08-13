import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { withRetry } from '../../../common/utils/retry';

export interface GeocodeResult {
  lat: number;
  lng: number;
  normalizedAddress: string;
}

/**
 * Address validation/geocoding. Stubbed against a mock endpoint for the MVP —
 * swap for a real provider (Google Geocoding, Mapbox, OpenStreetMap/Nominatim,
 * or a pan-African provider like OpenCage) without touching ShipmentService.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  constructor(private readonly config: ConfigService) {}

  async validateAndGeocode(address: {
    line1: string;
    city: string;
    country: string;
    postalCode?: string;
  }): Promise<GeocodeResult> {
    if (!address.line1 || !address.city || !address.country) {
      throw new BadRequestException('Address must include line1, city, and country');
    }

    const base = this.config.get<string>('GEOCODING_API_BASE', 'http://localhost:4001/geocode');
    try {
      const { data } = await withRetry(() => axios.post(`${base}`, address, { timeout: 3000 }), { retries: 1 });
      return data;
    } catch (err) {
      this.logger.warn(`Geocoding service unreachable, falling back to unverified address: ${(err as Error).message}`);
      // Graceful degradation: don't block shipment creation if the geocoder is down,
      // just proceed without coordinates (address is still stored as entered).
      return { lat: 0, lng: 0, normalizedAddress: `${address.line1}, ${address.city}, ${address.country}` };
    }
  }
}
