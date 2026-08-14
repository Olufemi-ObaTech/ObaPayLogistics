'use client';

import { useEffect, useState } from 'react';
import { getAdminFxRates, upsertAdminFxRate, FxRate } from '@/lib/api';
import { CURRENCY_FLAGS } from '@/lib/display';

const CURRENCIES = ['NGN', 'KES', 'ZAR', 'GHS', 'USD', 'EUR', 'XOF', 'EGP'];

export default function AdminFxRatesPage() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [form, setForm] = useState({ baseCurrency: 'USD', quoteCurrency: 'NGN', rate: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    getAdminFxRates().then(setRates).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await upsertAdminFxRate({ baseCurrency: form.baseCurrency, quoteCurrency: form.quoteCurrency, rate: Number(form.rate) });
      setSuccess(`Updated ${form.baseCurrency} → ${form.quoteCurrency}: ${form.rate}`);
      setForm((f) => ({ ...f, rate: '' }));
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">FX Rates</h1>
        <p className="mt-1 text-sm text-slate-500">Mid-market rates used for all wallet conversions, shipping margin, and crypto pricing.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      <form onSubmit={handleSubmit} className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Base</label>
          <select className="input" value={form.baseCurrency} onChange={(e) => setForm((f) => ({ ...f, baseCurrency: e.target.value }))}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Quote</label>
          <select className="input" value={form.quoteCurrency} onChange={(e) => setForm((f) => ({ ...f, quoteCurrency: e.target.value }))}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Rate (1 base = ? quote)</label>
          <input className="input" type="number" step="any" min={0} required value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
        </div>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Update Rate'}</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Pair</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {CURRENCY_FLAGS[r.baseCurrency] ?? ''} {r.baseCurrency} → {CURRENCY_FLAGS[r.quoteCurrency] ?? ''} {r.quoteCurrency}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{Number(r.rate).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.source}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(r.fetchedAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
