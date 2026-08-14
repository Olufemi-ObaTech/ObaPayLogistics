'use client';

import { useEffect, useState } from 'react';
import { getAirtimeNetworks, getDataBundles, buyAirtime, sellAirtime, buyData, getWalletBalances, DataBundle, WalletBalance } from '@/lib/api';

type Tab = 'BUY' | 'DATA' | 'SELL';

const NETWORK_COLORS: Record<string, string> = {
  MTN: 'bg-yellow-400 text-yellow-900', AIRTEL: 'bg-red-500 text-white', GLO: 'bg-emerald-500 text-white',
  '9MOBILE': 'bg-lime-500 text-lime-950', SAFARICOM: 'bg-green-600 text-white', VODACOM: 'bg-red-600 text-white',
};

export default function AirtimePage() {
  const [tab, setTab] = useState<Tab>('BUY');
  const [networks, setNetworks] = useState<string[]>([]);
  const [bundles, setBundles] = useState<DataBundle[]>([]);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [form, setForm] = useState({ network: '', phoneNumber: '', currency: 'NGN', amount: '', bundleCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getAirtimeNetworks().then((n) => { setNetworks(n); setForm((f) => ({ ...f, network: n[0] ?? '' })); }).catch(() => {});
    getDataBundles().then((b) => { setBundles(b); setForm((f) => ({ ...f, bundleCode: b[0]?.code ?? '' })); }).catch(() => {});
    getWalletBalances().then((w) => { setWallets(w); if (w[0]) setForm((f) => ({ ...f, currency: w[0].currency })); }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (tab === 'BUY') {
        await buyAirtime({ network: form.network, phoneNumber: form.phoneNumber, currency: form.currency, amount: Number(form.amount) });
        setSuccess(`${form.network} airtime top-up sent to ${form.phoneNumber}.`);
      } else if (tab === 'DATA') {
        const bundle = bundles.find((b) => b.code === form.bundleCode);
        await buyData({ network: form.network, phoneNumber: form.phoneNumber, currency: form.currency, bundleCode: form.bundleCode });
        setSuccess(`${bundle?.label ?? 'Data bundle'} activated on ${form.phoneNumber}.`);
      } else {
        await sellAirtime({ network: form.network, phoneNumber: form.phoneNumber, currency: form.currency, amount: Number(form.amount) });
        setSuccess(`Airtime resale accepted — your wallet has been credited (85% of face value).`);
      }
      setForm((f) => ({ ...f, amount: '' }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedBundle = bundles.find((b) => b.code === form.bundleCode);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Airtime &amp; Data</h1>
        <p className="mt-1 text-sm text-slate-500">Top up any network instantly, or turn unused airtime back into cash.</p>
      </div>

      <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-semibold shadow-sm">
        {(['BUY', 'DATA', 'SELL'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); setSuccess(null); }}
            className={`flex-1 rounded-md py-2 transition-colors ${tab === t ? 'bg-obapay-navy text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'BUY' ? 'Buy Airtime' : t === 'DATA' ? 'Buy Data' : 'Sell Airtime'}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {success && (
        <div className="animate-pop-in flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <span className="animate-check mt-0.5">✓</span><span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Network</label>
          <div className="flex flex-wrap gap-2">
            {networks.map((n) => (
              <button
                type="button" key={n}
                onClick={() => setForm((f) => ({ ...f, network: n }))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${form.network === n ? `${NETWORK_COLORS[n] ?? 'bg-obapay-navy text-white'} ring-2 ring-offset-1 ring-obapay-navy` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-slate-600">Phone number</label>
          <input id="phone" className="input" required placeholder="+2348012345678" value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
        </div>

        {tab === 'DATA' ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Data bundle</label>
            <div className="space-y-2">
              {bundles.map((b) => (
                <button
                  type="button" key={b.code}
                  onClick={() => setForm((f) => ({ ...f, bundleCode: b.code }))}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${form.bundleCode === b.code ? 'border-obapay-teal bg-obapay-teal/5' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <span className="font-medium text-slate-700">{b.label}</span>
                  <span className="font-semibold text-obapay-navy">₦{b.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="airtime-currency" className="mb-1.5 block text-xs font-medium text-slate-600">Wallet</label>
              <select id="airtime-currency" className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                {wallets.map((w) => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="airtime-amount" className="mb-1.5 block text-xs font-medium text-slate-600">Amount</label>
              <input id="airtime-amount" className="input" type="number" min={0.01} step={0.01} required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
        )}

        {tab === 'SELL' && form.amount && (
          <p className="text-xs text-slate-500">You'll receive ~{(Number(form.amount) * 0.85).toFixed(2)} {form.currency} (85% of face value).</p>
        )}

        <button type="submit" disabled={busy || !form.network || (tab === 'DATA' && !form.bundleCode)} className="btn-primary w-full">
          {busy ? 'Processing…' : tab === 'BUY' ? 'Buy Airtime' : tab === 'DATA' ? `Buy ${selectedBundle ? `— ₦${selectedBundle.price.toLocaleString()}` : ''}` : 'Sell Airtime'}
        </button>
      </form>
    </div>
  );
}
