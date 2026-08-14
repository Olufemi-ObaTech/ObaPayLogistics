// Thin fetch wrapper for the ObaPay API. Reads the JWT from localStorage
// (set at login) and attaches it, plus a per-call Idempotency-Key for any
// mutating logistics/payment endpoint that requires one.

import { getToken } from './auth';

// Includes the trailing /api segment: the Laravel backend namespaces every
// route under /api, unlike the original NestJS backend which didn't.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

// Backend validation errors (422s) come back as { field: [messages] } rather
// than a plain string; without this, new Error(someObject) silently
// stringifies to the literal text "[object Object]" in the UI.
function stringifyErrorMessage(message: unknown): string | undefined {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object') {
    const parts = Object.values(message as Record<string, unknown>)
      .flat()
      .filter((v): v is string => typeof v === 'string');
    if (parts.length) return parts.join(' ');
  }
  return undefined;
}

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
    throw new Error(stringifyErrorMessage(errorBody.message) ?? `Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Auth ---------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export function login(payload: { emailOrPhone: string; password: string; totpCode?: string; deviceFingerprint: string }) {
  return apiRequest<AuthTokens>('/auth/login', { method: 'POST', body: payload });
}

export function register(payload: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  preferredCurrency?: string;
  deviceFingerprint: string;
}) {
  return apiRequest<AuthTokens>('/auth/register', { method: 'POST', body: payload });
}

export function logout(refreshToken?: string) {
  return apiRequest<{ loggedOut: boolean }>('/auth/logout', { method: 'POST', body: { refreshToken } });
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  kycTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  totpEnabled: boolean;
  memberSince: string;
}

export function getMe() {
  return apiRequest<Profile>('/auth/me');
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

export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  feeAmount: string;
  fxSpreadAmount: string;
  sourceWalletId: string | null;
  destinationWalletId: string | null;
  narration: string | null;
  createdAt: string;
}

export function sendMoney(payload: { recipientIdentifier: string; currency: string; amount: number; narration?: string }) {
  return apiRequest<Transaction>('/wallet/send', { method: 'POST', body: payload, idempotent: true });
}

export function getTransactions() {
  return apiRequest<Transaction[]>('/transactions');
}

export function enableTotp() {
  return apiRequest<{ secret: string; otpAuthUrl: string }>('/auth/2fa/enable', { method: 'POST' });
}

export function confirmTotp(code: string) {
  return apiRequest<{ totpEnabled: boolean }>('/auth/2fa/confirm', { method: 'POST', body: { code } });
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

// --- Airtime & Data (simulated VTU) ---------------------------------------

export function getAirtimeNetworks() {
  return apiRequest<string[]>('/airtime/networks');
}

export interface DataBundle { code: string; label: string; price: number }

export function getDataBundles() {
  return apiRequest<DataBundle[]>('/airtime/data-bundles');
}

export function buyAirtime(payload: { network: string; phoneNumber: string; currency: string; amount: number }) {
  return apiRequest<Transaction>('/airtime/buy', { method: 'POST', body: payload, idempotent: true });
}

export function sellAirtime(payload: { network: string; phoneNumber: string; currency: string; amount: number }) {
  return apiRequest<Transaction>('/airtime/sell', { method: 'POST', body: payload, idempotent: true });
}

export function buyData(payload: { network: string; phoneNumber: string; currency: string; bundleCode: string }) {
  return apiRequest<Transaction>('/airtime/buy-data', { method: 'POST', body: payload, idempotent: true });
}

// --- Crypto (simulated — mock price feed, no real exchange) ---------------

export interface CryptoPrice { symbol: string; name: string; priceUsd: number; change24hPct: number }
export interface CryptoHolding { symbol: string; quantity: string; priceUsd: number; valueUsd: number }

export function getCryptoPrices() {
  return apiRequest<CryptoPrice[]>('/crypto/prices');
}

export function getCryptoHoldings() {
  return apiRequest<CryptoHolding[]>('/crypto/holdings');
}

export function buyCrypto(payload: { symbol: string; currency: string; fiatAmount: number }) {
  return apiRequest<Transaction>('/crypto/buy', { method: 'POST', body: payload, idempotent: true });
}

export function sellCrypto(payload: { symbol: string; currency: string; quantity: number }) {
  return apiRequest<Transaction>('/crypto/sell', { method: 'POST', body: payload, idempotent: true });
}

// --- Admin / ops ------------------------------------------------------------

export interface AdminStats {
  totalUsers: number;
  usersByStatus: Record<string, number>;
  totalShipments: number;
  shipmentsByStatus: Record<string, number>;
  totalTransactions: number;
  walletsByCurrency: { currency: string; total: string; held: string }[];
  revenueByCurrency: { currency: string; fees: string; fxSpread: string }[];
  pendingDocumentReviews: number;
}

export function getAdminStats() {
  return apiRequest<AdminStats>('/admin/stats');
}

export interface AdminUser {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  status: string; role: string; kycTier: string; country: string; createdAt: string;
  walletsCount: number; shipmentsCount: number;
}

export interface Paginated<T> { data: T[]; currentPage: number; lastPage: number; total: number }

export function getAdminUsers(params: { search?: string; status?: string; page?: number } = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiRequest<Paginated<AdminUser>>(`/admin/users${qs ? `?${qs}` : ''}`);
}

export function getAdminUser(id: string) {
  return apiRequest<{ user: AdminUser & { wallets: WalletBalance[] }; recentTransactions: Transaction[]; shipmentCount: number }>(`/admin/users/${id}`);
}

export function updateUserStatus(id: string, status: string) {
  return apiRequest<AdminUser>(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } });
}

export function getAdminTransactions(params: { type?: string; status?: string; page?: number } = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiRequest<Paginated<Transaction>>(`/admin/transactions${qs ? `?${qs}` : ''}`);
}

export function getAdminShipments(params: { status?: string; page?: number } = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiRequest<Paginated<Shipment>>(`/admin/shipments${qs ? `?${qs}` : ''}`);
}

export interface FxRate { id: string; baseCurrency: string; quoteCurrency: string; rate: string; source: string; fetchedAt: string }

export function getAdminFxRates() {
  return apiRequest<FxRate[]>('/admin/fx-rates');
}

export function upsertAdminFxRate(payload: { baseCurrency: string; quoteCurrency: string; rate: number }) {
  return apiRequest<FxRate>('/admin/fx-rates', { method: 'POST', body: payload });
}

export function getAdminTeam() {
  return apiRequest<AdminUser[]>('/admin/team');
}

export function promoteToAdmin(id: string) {
  return apiRequest<AdminUser>(`/admin/team/${id}/promote`, { method: 'POST' });
}

export function demoteAdmin(id: string) {
  return apiRequest<AdminUser>(`/admin/team/${id}/demote`, { method: 'POST' });
}
