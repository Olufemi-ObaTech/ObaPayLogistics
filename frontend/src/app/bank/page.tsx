'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWalletBalances, getTransactions, WalletBalance, Transaction } from '@/lib/api';
import { TransactionRow } from '@/components/TransactionRow';
import { CURRENCY_FLAGS } from '@/lib/display';

const CURRENCY_LABELS: Record<string, string> = {
  NGN: 'Nigerian Naira', KES: 'Kenyan Shilling', ZAR: 'South African Rand', GHS: 'Ghanaian Cedi',
  USD: 'US Dollar', EUR: 'Euro', XOF: 'West African CFA', EGP: 'Egyptian Pound',
};

const QUICK_ACTIONS = [
  { href: '/bank/send', label: 'Send Money', icon: '↗' },
  { href: '/bank/airtime', label: 'Airtime & Data', icon: '📱' },
  { href: '/bank/crypto', label: 'Crypto', icon: '₿' },
  { href: '/logistics/send-parcel', label: 'Ship a Parcel', icon: '📦' },
  { href: '/bank/transactions', label: 'Activity', icon: '≡' },
  { href: '/bank/settings', label: 'Security', icon: '⚙' },
];

export default function BankDashboardPage() {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  function copyWalletId(id: string) {
    navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    Promise.all([getWalletBalances(), getTransactions()])
      .then(([b, t]) => { setBalances(b); setTransactions(t); })
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
          {primary && (
            <div className="relative overflow-hidden rounded-2xl bg-obapay-navy p-6 text-white shadow-lg shadow-obapay-navy/20 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{ background: 'radial-gradient(circle at 90% 0%, rgba(15,181,174,0.35), transparent 55%)' }}
              />
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-white/60">
                  {CURRENCY_FLAGS[primary.currency] ?? ''} {CURRENCY_LABELS[primary.currency] ?? primary.currency}
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                  {Number(primary.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="ml-2 text-lg font-semibold text-white/60">{primary.currency}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {Number(primary.heldBalance) > 0 && (
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-300">
                      {Number(primary.heldBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} held in escrow
                    </p>
                  )}
                  <button
                    onClick={() => copyWalletId(primary.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  >
                    {copied ? '✓ Copied' : `Wallet ID: ${primary.id.slice(0, 8)}…`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {balances.length > 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {balances.slice(1).map((wallet) => (
                <div key={wallet.id} className="card">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {CURRENCY_FLAGS[wallet.currency] ?? ''} {wallet.currency}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-obapay-navy">
                    {Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card flex flex-col items-center gap-2 py-5 text-center transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-obapay-teal/10 text-lg text-obapay-teal">{action.icon}</span>
            <span className="text-xs font-semibold text-obapay-navy">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent activity preview */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-obapay-navy">Recent Activity</h2>
          <Link href="/bank/transactions" className="text-xs font-medium text-obapay-teal hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="card h-24 animate-pulse bg-slate-100" />
        ) : transactions.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            {transactions.slice(0, 5).map((txn) => <TransactionRow key={txn.id} txn={txn} />)}
          </div>
        )}
      </div>
    </div>
  );
}
