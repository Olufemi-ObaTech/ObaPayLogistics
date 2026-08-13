'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWalletBalances, WalletBalance } from '@/lib/api';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy">Your Wallets</h1>
        <p className="text-sm text-gray-500">P2P transfers, bill payments, and intra-wallet moves are always free.</p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading balances…</p>}
      {error && <p className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((wallet) => (
          <div key={wallet.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{wallet.currency}</p>
            <p className="mt-1 text-2xl font-bold text-obapay-navy">
              {Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            {Number(wallet.heldBalance) > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                {Number(wallet.heldBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} held in escrow (pending shipments)
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-obapay-teal/50 bg-obapay-teal/5 p-5">
        <h2 className="font-semibold text-obapay-navy">Shipping a parcel?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Pay for shipping directly from your wallet balance above — no separate checkout needed.
        </p>
        <Link href="/logistics/send-parcel" className="mt-3 inline-block rounded-lg bg-obapay-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Send a Parcel
        </Link>
      </div>
    </div>
  );
}
