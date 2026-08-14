'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendMoney, getWalletBalances, WalletBalance } from '@/lib/api';
import { useEffect } from 'react';

export default function SendMoneyPage() {
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [form, setForm] = useState({ recipientIdentifier: '', currency: 'NGN', amount: '', narration: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ amount: string; currency: string; recipient: string } | null>(null);

  useEffect(() => {
    getWalletBalances().then((w) => {
      setWallets(w);
      if (w[0]) setForm((f) => ({ ...f, currency: w[0].currency }));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendMoney({
        recipientIdentifier: form.recipientIdentifier,
        currency: form.currency,
        amount: Number(form.amount),
        narration: form.narration || undefined,
      });
      setSuccess({ amount: form.amount, currency: form.currency, recipient: form.recipientIdentifier });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="animate-pop-in mx-auto max-w-md space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
        <div className="animate-check mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</div>
        <h2 className="text-xl font-bold text-emerald-800">Money Sent</h2>
        <p className="text-sm text-emerald-700">
          {Number(success.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {success.currency} sent to {success.recipient} — free, instant, no fees.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => { setSuccess(null); setForm({ recipientIdentifier: '', currency: form.currency, amount: '', narration: '' }); }} className="btn-secondary">
            Send another
          </button>
          <button onClick={() => router.push('/bank')} className="btn-primary">Back to Wallet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Send Money</h1>
        <p className="mt-1 text-sm text-slate-500">Free, instant transfers to any ObaPay user — no fees, ever.</p>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <span className="mt-0.5">⚠</span><span>{error}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="send-to" className="mb-1.5 block text-xs font-medium text-slate-600">Recipient's email or phone</label>
          <input
            id="send-to" className="input" required placeholder="e.g. friend@email.com or +2348012345678"
            value={form.recipientIdentifier}
            onChange={(e) => setForm((f) => ({ ...f, recipientIdentifier: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="send-currency" className="mb-1.5 block text-xs font-medium text-slate-600">From wallet</label>
            <select
              id="send-currency" className="input"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              {wallets.map((w) => (
                <option key={w.currency} value={w.currency}>
                  {w.currency} — {Number(w.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="send-amount" className="mb-1.5 block text-xs font-medium text-slate-600">Amount</label>
            <input
              id="send-amount" className="input" type="number" min={0.01} step={0.01} required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label htmlFor="send-note" className="mb-1.5 block text-xs font-medium text-slate-600">Note (optional)</label>
          <input
            id="send-note" className="input" placeholder="What's this for?" maxLength={140}
            value={form.narration}
            onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={busy || wallets.length === 0} className="btn-primary w-full">
          {busy ? 'Sending…' : 'Send Money'}
        </button>
      </form>
    </div>
  );
}
