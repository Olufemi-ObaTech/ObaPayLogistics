'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWalletBalances, WalletBalance } from '@/lib/api';

const CURRENCY_LABELS: Record<string, string> = {
  NGN: 'Nigerian Naira', KES: 'Kenyan Shilling', ZAR: 'South African Rand', GHS: 'Ghanaian Cedi',
  USD: 'US Dollar', EUR: 'Euro', XOF: 'West African CFA', EGP: 'Egyptian Pound',
};

export default function WalletDashboardPage() {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWalletBalances()
      .then(setBalances)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const primary = balances[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Your Wallets</h1>
        <p className="mt-1 text-sm text-slate-500">P2P transfers, bill payments, and intra-wallet moves are always free.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="card h-40 animate-pulse bg-slate-100" />
      ) : balances.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">No wallets yet.</div>
      ) : (
        <>
          {/* Hero card for the primary wallet */}
          {primary && (
            <div className="relative overflow-hidden rounded-2xl bg-obapay-navy p-6 text-white shadow-lg shadow-obapay-navy/20 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{ background: 'radial-gradient(circle at 90% 0%, rgba(15,181,174,0.35), transparent 55%)' }}
              />
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-white/60">{CURRENCY_LABELS[primary.currency] ?? primary.currency}</p>
                <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                  {Number(primary.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="ml-2 text-lg font-semibold text-white/60">{primary.currency}</span>
                </p>
                {Number(primary.heldBalance) > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-300">
                    {Number(primary.heldBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} held in escrow
                  </p>
                )}
              </div>
            </div>
          )}

          {balances.length > 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {balances.slice(1).map((wallet) => (
                <div key={wallet.id} className="card">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{wallet.currency}</p>
                  <p className="mt-1 text-2xl font-bold text-obapay-navy">
                    {Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  {Number(wallet.heldBalance) > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      {Number(wallet.heldBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} held in escrow
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="card flex flex-col items-start gap-4 border-dashed border-obapay-teal/40 bg-obapay-teal/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-obapay-navy">Shipping a parcel?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pay for shipping directly from your wallet balance — no separate checkout needed.
          </p>
        </div>
        <Link href="/logistics/send-parcel" className="btn-primary w-full flex-shrink-0 sm:w-auto">
          Send a Parcel
        </Link>
      </div>
    </div>
  );
}
