'use client';

import { useEffect, useState } from 'react';
import { getCryptoPrices, getCryptoHoldings, buyCrypto, sellCrypto, getWalletBalances, CryptoPrice, CryptoHolding, WalletBalance } from '@/lib/api';

const COIN_ICONS: Record<string, string> = { BTC: '₿', ETH: 'Ξ', USDT: '₮', BNB: '◆', SOL: '◎', XRP: '✕' };

export default function CryptoPage() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [selected, setSelected] = useState<string>('BTC');
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    Promise.all([getCryptoPrices(), getCryptoHoldings(), getWalletBalances()])
      .then(([p, h, w]) => {
        setPrices(p);
        setHoldings(h);
        setWallets(w);
        if (w[0]) setCurrency((c) => c || w[0].currency);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  const activePrice = prices.find((p) => p.symbol === selected);
  const activeHolding = holdings.find((h) => h.symbol === selected);

  async function handleTrade(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'BUY') {
        await buyCrypto({ symbol: selected, currency, fiatAmount: Number(amount) });
        setSuccess(`Bought ${selected} for ${Number(amount).toLocaleString()} ${currency}.`);
      } else {
        await sellCrypto({ symbol: selected, currency, quantity: Number(amount) });
        setSuccess(`Sold ${amount} ${selected}.`);
      }
      setAmount('');
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Crypto</h1>
        <p className="mt-1 text-sm text-slate-500">
          Simulated market — practice buying and selling without real risk. Not connected to a real exchange.
        </p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {success && (
        <div className="animate-pop-in flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <span className="animate-check mt-0.5">✓</span><span>{success}</span>
        </div>
      )}

      {/* Market */}
      <div className="card p-0">
        {loading ? (
          <div className="h-40 animate-pulse bg-slate-100" />
        ) : (
          <div className="divide-y divide-slate-100">
            {prices.map((p) => (
              <button
                key={p.symbol} onClick={() => setSelected(p.symbol)}
                className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors ${selected === p.symbol ? 'bg-obapay-teal/5' : 'hover:bg-slate-50'}`}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-obapay-navy text-sm font-bold text-white">{COIN_ICONS[p.symbol] ?? p.symbol[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{p.name} <span className="text-xs text-slate-400">{p.symbol}</span></p>
                  {holdings.find((h) => h.symbol === p.symbol) && (
                    <p className="text-xs text-obapay-teal">Holding: {holdings.find((h) => h.symbol === p.symbol)?.quantity}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">${p.priceUsd.toLocaleString()}</p>
                  <p className={`text-xs font-medium ${p.change24hPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {p.change24hPct >= 0 ? '▲' : '▼'} {Math.abs(p.change24hPct)}%
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trade */}
      <form onSubmit={handleTrade} className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-obapay-navy">Trade {selected}</h2>
          {activePrice && <span className="text-sm text-slate-500">${activePrice.priceUsd.toLocaleString()}</span>}
        </div>

        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
          <button type="button" onClick={() => setMode('BUY')} className={`flex-1 rounded-md py-2 transition-colors ${mode === 'BUY' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>Buy</button>
          <button type="button" onClick={() => setMode('SELL')} className={`flex-1 rounded-md py-2 transition-colors ${mode === 'SELL' ? 'bg-rose-500 text-white' : 'text-slate-500'}`}>Sell</button>
        </div>

        {mode === 'BUY' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="crypto-currency" className="mb-1.5 block text-xs font-medium text-slate-600">Pay with</label>
              <select id="crypto-currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {wallets.map((w) => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="crypto-amount" className="mb-1.5 block text-xs font-medium text-slate-600">Amount</label>
              <input id="crypto-amount" className="input" type="number" min={0.01} step={0.01} required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="crypto-qty" className="mb-1.5 block text-xs font-medium text-slate-600">
              Quantity to sell {activeHolding ? `(you hold ${activeHolding.quantity})` : '(no holding yet)'}
            </label>
            <input id="crypto-qty" className="input" type="number" min={0.00000001} step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        )}

        <button type="submit" disabled={busy} className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${mode === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
          {busy ? 'Processing…' : `${mode === 'BUY' ? 'Buy' : 'Sell'} ${selected}`}
        </button>
      </form>
    </div>
  );
}
