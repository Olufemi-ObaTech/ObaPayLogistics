'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createShipment,
  confirmShipment,
  getRates,
  getWalletBalances,
  RateQuote,
  Shipment,
  WalletBalance,
} from '@/lib/api';

const CUSTOMS_CATEGORIES = ['DOCUMENTS', 'GIFTS', 'COMMERCIAL_SAMPLE', 'PERSONAL_EFFECTS', 'ELECTRONICS', 'MERCHANDISE', 'OTHER'];
const SHIPPING_METHODS = ['AIR', 'SEA', 'ROAD'];

type Step = 'FORM' | 'QUOTE' | 'CONFIRMED';

export default function SendParcelPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('FORM');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    originLine1: '', originCity: '', originCountry: 'NG',
    destinationLine1: '', destinationCity: '', destinationCountry: 'KE',
    weightKg: 1, length: 20, width: 15, height: 10,
    declaredValue: 50, declaredValueCurrency: 'USD',
    customsCategory: 'GIFTS', shippingMethod: 'AIR',
  });

  const [quote, setQuote] = useState<{ recommended: RateQuote; allQuotes: RateQuote[] } | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleGetRates(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await getRates(form);
      setQuote(result);
      const balances = await getWalletBalances();
      setWallets(balances);
      setSelectedWalletId(balances[0]?.id ?? '');
      setStep('QUOTE');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAndPay() {
    setBusy(true);
    setError(null);
    try {
      const created = await createShipment({
        originAddress: { line1: form.originLine1, city: form.originCity, country: form.originCountry },
        destinationAddress: { line1: form.destinationLine1, city: form.destinationCity, country: form.destinationCountry },
        weightKg: Number(form.weightKg),
        dimensionsCm: { length: Number(form.length), width: Number(form.width), height: Number(form.height) },
        declaredValue: Number(form.declaredValue),
        declaredValueCurrency: form.declaredValueCurrency,
        customsCategory: form.customsCategory,
        shippingMethod: form.shippingMethod,
      });

      const paid = await confirmShipment(created.shipment.id, selectedWalletId);
      setShipment(paid);
      setStep('CONFIRMED');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-obapay-navy">Send a Parcel</h1>

      {error && <p className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {step === 'FORM' && (
        <form onSubmit={handleGetRates} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="col-span-2 mb-1 text-sm font-semibold text-obapay-navy">Origin</legend>
            <input className="input" placeholder="Address line 1" value={form.originLine1} onChange={(e) => update('originLine1', e.target.value)} required />
            <input className="input" placeholder="City" value={form.originCity} onChange={(e) => update('originCity', e.target.value)} required />
            <input className="input" placeholder="Country (ISO2, e.g. NG)" maxLength={2} value={form.originCountry} onChange={(e) => update('originCountry', e.target.value.toUpperCase())} required />
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="col-span-2 mb-1 text-sm font-semibold text-obapay-navy">Destination</legend>
            <input className="input" placeholder="Address line 1" value={form.destinationLine1} onChange={(e) => update('destinationLine1', e.target.value)} required />
            <input className="input" placeholder="City" value={form.destinationCity} onChange={(e) => update('destinationCity', e.target.value)} required />
            <input className="input" placeholder="Country (ISO2, e.g. KE)" maxLength={2} value={form.destinationCountry} onChange={(e) => update('destinationCountry', e.target.value.toUpperCase())} required />
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <legend className="col-span-2 mb-1 text-sm font-semibold text-obapay-navy sm:col-span-4">Parcel</legend>
            <label className="text-xs text-gray-500">Weight (kg)
              <input type="number" min={0.1} step={0.1} className="input mt-1" value={form.weightKg} onChange={(e) => update('weightKg', Number(e.target.value))} />
            </label>
            <label className="text-xs text-gray-500">Length (cm)
              <input type="number" min={1} className="input mt-1" value={form.length} onChange={(e) => update('length', Number(e.target.value))} />
            </label>
            <label className="text-xs text-gray-500">Width (cm)
              <input type="number" min={1} className="input mt-1" value={form.width} onChange={(e) => update('width', Number(e.target.value))} />
            </label>
            <label className="text-xs text-gray-500">Height (cm)
              <input type="number" min={1} className="input mt-1" value={form.height} onChange={(e) => update('height', Number(e.target.value))} />
            </label>
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="text-xs text-gray-500">Declared value
              <input type="number" min={1} className="input mt-1" value={form.declaredValue} onChange={(e) => update('declaredValue', Number(e.target.value))} />
            </label>
            <label className="text-xs text-gray-500">Item category
              <select className="input mt-1" value={form.customsCategory} onChange={(e) => update('customsCategory', e.target.value)}>
                {CUSTOMS_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500">Shipping method
              <select className="input mt-1" value={form.shippingMethod} onChange={(e) => update('shippingMethod', e.target.value)}>
                {SHIPPING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </fieldset>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Fetching rates…' : 'Get Shipping Rates'}
          </button>
        </form>
      )}

      {step === 'QUOTE' && quote && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-obapay-navy">Estimated Cost</h2>
          <div className="rounded-lg bg-obapay-teal/10 p-4">
            <p className="text-3xl font-bold text-obapay-navy">
              {quote.recommended.amount.toLocaleString()} {quote.recommended.currency}
            </p>
            <p className="text-sm text-gray-600">via {quote.recommended.courierCode} · {quote.recommended.estimatedDays} days estimated</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-gray-400">All quotes</p>
            <ul className="space-y-1 text-sm">
              {quote.allQuotes.map((q) => (
                <li key={q.courierCode} className="flex justify-between rounded border border-gray-100 px-3 py-2">
                  <span>{q.courierCode}</span>
                  <span>{q.amount.toLocaleString()} {q.currency} · {q.estimatedDays}d</span>
                </li>
              ))}
            </ul>
          </div>

          <label className="block text-xs text-gray-500">
            Pay from wallet
            <select className="input mt-1" value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.currency} — balance {Number(w.balance).toLocaleString()}</option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <button onClick={() => setStep('FORM')} className="btn-secondary flex-1">Back</button>
            <button onClick={handleCreateAndPay} disabled={busy || !selectedWalletId} className="btn-primary flex-1">
              {busy ? 'Processing…' : 'Confirm & Pay from Wallet'}
            </button>
          </div>
        </div>
      )}

      {step === 'CONFIRMED' && shipment && (
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-emerald-800">Shipment Confirmed 🎉</h2>
          <p className="text-sm text-emerald-700">Tracking number</p>
          <p className="text-2xl font-mono font-bold text-emerald-900">{shipment.trackingNumber}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={() => router.push(`/logistics/shipments/${shipment.id}`)} className="btn-primary">
              Track this shipment
            </button>
            <button onClick={() => router.push('/logistics/shipments')} className="btn-secondary">
              View all shipments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
