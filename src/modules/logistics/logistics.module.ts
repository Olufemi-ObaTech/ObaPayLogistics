import { Module } from '@nestjs/common';
import { ShipmentModule } from './shipment/shipment.module';
import { CustomsModule } from './customs/customs.module';
import { CourierModule } from './courier/courier.module';
import { GeocodingModule } from './geocoding/geocoding.module';

/**
 * Top-level Logistics domain module (Shipment, Tracking, Courier Integration,
 * Customs) — the microservice boundary called out in the architecture, wired
 * here as a Nest module for the monolith-first MVP. Each submodule below can
 * be split into its own deployable service later without changing call sites,
 * since everything communicates through injected services, not direct imports.
 */
@Module({
  imports: [ShipmentModule, CustomsModule, CourierModule, GeocodingModule],
})
export class LogisticsModule {}
