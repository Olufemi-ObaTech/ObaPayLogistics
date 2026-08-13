// Thin fetch wrapper for the ObaPay API. Reads the JWT from localStorage
// (set at login) and attaches it, plus a per-call Idempotency-Key for any
// mutating logistics/payment endpoint that requires one.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('obapay_access_token');
}

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  idempotent?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotent) headers['Idempotency-Key'] = newIdempotencyKey();

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message ?? `Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Domain types (mirrors backend DTOs/entities) -------------------------

export type ShipmentStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'CUSTOMS_CLEARANCE'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED';

export interface Address {
  line1: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface Shipment {
  id: string;
  originAddress: Address;
  destinationAddress: Address;
  weightKg: string;
  declaredValue: string;
  declaredValueCurrency: string;
  customsCategory: string;
  shippingMethod: 'AIR' | 'SEA' | 'ROAD';
  status: ShipmentStatus;
  trackingNumber: string | null;
  finalPrice: string | null;
  priceCurrency: string | null;
  courierPartner?: { code: string; name: string } | null;
  createdAt: string;
}

export interface TrackingEvent {
  id: string;
  timestamp: string;
  location: string;
  status: ShipmentStatus;
  description: string;
}

export interface RateQuote {
  courierCode: string;
  amount: number;
  currency: string;
  estimatedDays: number;
}

export interface WalletBalance {
  id: string;
  currency: string;
  balance: string;
  heldBalance: string;
}

// --- Logistics API calls ---------------------------------------------------

export function getRates(params: {
  originLine1: string;
  originCity: string;
  originCountry: string;
  destinationLine1: string;
  destinationCity: string;
  destinationCountry: string;
  weightKg: number;
  length: number;
  width: number;
  height: number;
  shippingMethod: string;
}) {
  const qs = new URLSearchParams(params as any).toString();
  return apiRequest<{ recommended: RateQuote; allQuotes: RateQuote[]; unavailableCouriers: string[] }>(`/rates?${qs}`);
}

export function createShipment(payload: {
  originAddress: Address;
  destinationAddress: Address;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
  declaredValue: number;
  declaredValueCurrency: string;
  customsCategory: string;
  shippingMethod: string;
}) {
  return apiRequest<{ shipment: Shipment; estimatedCost: { amount: number; currency: string }; selectedCourier: string }>(
    '/shipment/create',
    { method: 'POST', body: payload, idempotent: true },
  );
}

export function confirmShipment(shipmentId: string, walletId: string) {
  return apiRequest<Shipment>('/shipment/confirm', { method: 'POST', body: { shipmentId, walletId }, idempotent: true });
}

export function trackShipment(shipmentId: string) {
  return apiRequest<{ shipment: Shipment; latestEvent: TrackingEvent | null; events: TrackingEvent[] }>(
    `/shipment/${shipmentId}/track`,
  );
}

export function getShipmentHistory() {
  return apiRequest<Shipment[]>('/shipment/history');
}

export function getWalletBalances() {
  return apiRequest<WalletBalance[]>('/wallet/balances');
}

export function uploadCustomsDocument(payload: { shipmentId: string; documentType: string; fileUrl: string }) {
  return apiRequest('/customs/upload', { method: 'POST', body: payload, idempotent: true });
}

export function getCustomsStatus(shipmentId: string) {
  return apiRequest<{
    status: ShipmentStatus;
    isClearanceStage: boolean;
    isCleared: boolean;
    missingDocuments: string[];
    documents: { documentType: string; verificationStatus: string }[];
  }>(`/customs/status/${shipmentId}`);
}
